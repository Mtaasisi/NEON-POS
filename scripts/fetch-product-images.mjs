#!/usr/bin/env node
/**
 * Enhanced Script: fetch-product-images.mjs
 * - Searches Unsplash for product images when missing
 * - Downloads image, optionally resizes using sharp, uploads to Supabase Storage
 * - Inserts product_images row and updates lats_products.image_url if empty
 * - Supports: --dry (dry run), --batch=N, --limit=N
 *
 * Usage:
 *   UNSPLASH_ACCESS_KEY=your_key node scripts/fetch-product-images.mjs --batch=20
 */

import 'dotenv/config';
import { supabase } from '../src/lib/supabaseClient';
import fs from 'fs';
import path from 'path';

const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY;
if (!UNSPLASH_KEY) {
  console.error('ERROR: UNSPLASH_ACCESS_KEY environment variable is required.');
  process.exit(1);
}

// parse args
const argv = Object.fromEntries(process.argv.slice(2).map(arg => {
  const [k, v] = arg.split('=');
  return [k.replace(/^-+/, ''), v === undefined ? true : v];
}));

const DRY = !!argv.dry;
const BATCH = Number(argv.batch || argv.b) || 20;
const CONCURRENCY = Number(argv.concurrency || argv.c) || 4;
const LIMIT = argv.limit ? Number(argv.limit) : null;
const RETRY_ATTEMPTS = Number(argv.retryAttempts || argv.retry_attempts || argv.r) || 3;
const RETRY_BASE_MS = Number(argv.retryBaseMs || argv.retry_base_ms || argv.bm) || 500;
const LOG_CSV = path.resolve(process.cwd(), 'fetch-product-images-log.csv');

let sharpLib = null;
try {
  // dynamically import sharp if available
  // eslint-disable-next-line no-await-in-loop
  sharpLib = await import('sharp');
  console.log('✅ sharp available — will generate thumbnails');
} catch (err) {
  console.log('ℹ️ sharp not available — skipping server-side resizing (will upload original image as thumbnail)');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function searchUnsplash(query) {
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1`;
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Client-ID ${UNSPLASH_KEY}`,
        'Accept-Version': 'v1'
      }
    });
    if (!res.ok) {
      console.warn(`Unsplash request failed: ${res.status} ${res.statusText}`);
      return null;
    }
    const data = await res.json();
    if (data && data.results && data.results.length > 0) {
      return data.results[0].urls?.regular || data.results[0].urls?.small || data.results[0].urls?.raw || null;
    }
    return null;
  } catch (err) {
    console.error('Unsplash search error', err);
    return null;
  }
}

function appendCsvRow(row) {
  const header = 'product_id,product_name,found_url,uploaded_url,thumbnail_url,status,message\n';
  if (!fs.existsSync(LOG_CSV)) fs.writeFileSync(LOG_CSV, header);
  fs.appendFileSync(LOG_CSV, row + '\n');
}

// Generic retry with exponential backoff and permanent error detection
async function retryWithBackoff(fn, attempts = RETRY_ATTEMPTS, baseMs = RETRY_BASE_MS) {
  let attempt = 0;
  while (true) {
    try {
      const result = await fn();

      // If result looks like a Fetch Response and it's not ok, treat as error with status
      if (result && typeof result.ok === 'boolean' && result.ok === false) {
        const status = result.status || 0;
        const err = new Error(`HTTP ${status}`);
        err.status = status;
        throw err;
      }

      return result;
    } catch (err) {
      // If error is permanent (4xx) do not retry
      const status = err && (err.status || (err.statusCode && Number(err.statusCode))) || 0;
      if (status >= 400 && status < 500) {
        throw err;
      }

      attempt++;
      if (attempt >= attempts) throw err;
      const wait = Math.min(baseMs * Math.pow(2, attempt - 1), 30000);
      console.warn(`Operation failed (attempt ${attempt}/${attempts}), retrying in ${wait}ms...`);
      await sleep(wait);
    }
  }
}

async function processBatch(products) {
  // create task functions for concurrency
  const tasks = products.map((p) => async () => {
    if (LIMIT && Number(p.id) > LIMIT) {
      console.log('Limit reached, stopping.');
      return;
    }

    console.log(`\nSearching image for: ${p.name} (id=${p.id})`);
    const foundUrl = await retryWithBackoff(() => searchUnsplash(p.name || 'product'), 3, 500);
    if (!foundUrl) {
      console.log('No image found, skipping.');
      appendCsvRow(`${p.id},"${p.name}","","","",skipped,no-image-found`);
      await sleep(500);
      return;
    }

    // check existing product_images
    try {
      const { data: existingImgs } = await supabase
        .from('product_images')
        .select('id')
        .eq('product_id', p.id)
        .limit(1);

      if (existingImgs && existingImgs.length > 0) {
        console.log('Product already has images, skipping insert.');
        appendCsvRow(`${p.id},"${p.name}","${foundUrl}","","",skipped,has-image`);
        await sleep(300);
        return;
      }
    } catch (err) {
      console.warn('Failed to check existing product images, will attempt insert anyway:', err);
    }

    try {
      // download image
      const imageResp = await retryWithBackoff(() => fetch(foundUrl), 3, 500);
      if (!imageResp.ok) {
        console.warn('Failed to download image for upload:', imageResp.status);
        appendCsvRow(`${p.id},"${p.name}","${foundUrl}","","",failed,download-failed`);
        await sleep(500);
        return;
      }

      const arrayBuffer = await imageResp.arrayBuffer();
      let buffer = Buffer.from(arrayBuffer);
      const contentType = imageResp.headers.get('content-type') || 'image/jpeg';

      // generate filenames
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 10);
      const extMatch = contentType.match(/image\/(jpeg|png|webp|gif)/i);
      const extension = extMatch ? (extMatch[1] === 'jpeg' ? 'jpg' : extMatch[1]) : 'jpg';
      let fileName = `${p.id}_${timestamp}_${randomId}.${extension}`;
      let thumbName = `thumbnails/${p.id}_${timestamp}_${randomId}.${extension}`;

      let uploadedUrl = '';
      let thumbnailUrl = '';

      if (DRY) {
        console.log(`[DRY] Would upload ${fileName} and thumbnail ${thumbName}`);
        appendCsvRow(`${p.id},"${p.name}","${foundUrl}","DRY_UPLOAD","DRY_THUMB",dry,ok`);
      } else {
        // if sharp available, generate resized main + thumbnail
        if (sharpLib) {
          try {
            const sharp = sharpLib.default;
            // main: resize to max 1600 width and convert to lossy WebP (quality 80)
            const mainBuffer = await sharp(buffer)
              .resize({ width: 1600, withoutEnlargement: true })
              .webp({ quality: 80 })
              .toBuffer();
            // thumbnail: 400px width and convert to WebP
            const thumbBuffer = await sharp(buffer)
              .resize({ width: 400, withoutEnlargement: true })
              .webp({ quality: 80 })
              .toBuffer();

            // update extension to webp
            const webpFileName = fileName.replace(/\.[^.]+$/, '.webp');
            const webpThumbName = thumbName.replace(/\.[^.]+$/, '.webp');

            // upload main (webp)
            const { data: upMain, error: upMainErr } = await retryWithBackoff(
              () => supabase.storage.from('product-images').upload(webpFileName, mainBuffer, { contentType: 'image/webp' }),
              3,
              500
            );
            if (upMainErr) throw upMainErr;
            uploadedUrl = supabase.storage.from('product-images').getPublicUrl(webpFileName).data.publicUrl;

            // upload thumbnail (webp)
            const { data: upThumb, error: upThumbErr } = await retryWithBackoff(
              () => supabase.storage.from('product-images').upload(webpThumbName, thumbBuffer, { contentType: 'image/webp' }),
              3,
              500
            );
            if (upThumbErr) throw upThumbErr;
            thumbnailUrl = supabase.storage.from('product-images').getPublicUrl(webpThumbName).data.publicUrl;

            // override names for DB insert
            fileName = webpFileName;
            thumbName = webpThumbName;
          } catch (procErr) {
            console.warn('sharp processing or upload failed, falling back to raw upload:', procErr);
          }
        }

        // If no uploadedUrl yet (sharp missing or failed) upload original buffer
        if (!uploadedUrl) {
          try {
            const { data: uploadData, error: uploadError } = await retryWithBackoff(
              () => supabase.storage.from('product-images').upload(fileName, buffer, { contentType }),
              3,
              500
            );
            if (uploadError) throw uploadError;
            uploadedUrl = supabase.storage.from('product-images').getPublicUrl(fileName).data.publicUrl;
            // use same as thumbnail if no thumb generated
            if (!thumbnailUrl) thumbnailUrl = uploadedUrl;
          } catch (uploadErr) {
            console.warn('Storage upload failed, falling back to hotlink insertion:', uploadErr);
            // fallback: use foundUrl as image and thumbnail
            uploadedUrl = foundUrl;
            thumbnailUrl = foundUrl;
          }
        }

        // insert DB row
        try {
          const { data: insertData, error: insertError } = await retryWithBackoff(
            () => supabase.from('product_images').insert([{
              product_id: p.id,
              image_url: uploadedUrl,
              thumbnail_url: thumbnailUrl,
              file_name: fileName,
              file_size: buffer.length,
              is_primary: true
            }]),
            3,
            500
          );
          if (insertError) {
            console.warn('Failed to insert product_images after upload:', insertError);
            appendCsvRow(`${p.id},"${p.name}","${foundUrl}","${uploadedUrl}","${thumbnailUrl}",failed,db-insert-failed`);
          } else {
            console.log('Inserted product_images (uploaded): ok');
            // update lats_products.image_url if empty
            const { data: prodRow } = await retryWithBackoff(
              () => supabase.from('lats_products').select('image_url').eq('id', p.id).single(),
              3,
              500
            );

            if (!prodRow || !prodRow.image_url) {
              const { error: updErr } = await retryWithBackoff(
                () => supabase.from('lats_products').update({ image_url: uploadedUrl }).eq('id', p.id),
                3,
                500
              );
              if (updErr) {
                console.warn('Failed to update product image_url:', updErr);
              } else {
                console.log('Updated product.image_url to uploaded URL');
              }
            } else {
              console.log('Product.image_url already set, not overwriting');
            }

            appendCsvRow(`${p.id},"${p.name}","${foundUrl}","${uploadedUrl}","${thumbnailUrl}",ok,uploaded`);
          }
        } catch (dbErr) {
          console.error('DB insert error', dbErr);
          appendCsvRow(`${p.id},"${p.name}","${foundUrl}","${uploadedUrl}","${thumbnailUrl}",failed,db-insert-exception`);
        }
      }
    } catch (err) {
      console.error('Download/upload error', err);
      appendCsvRow(`${p.id},"${p.name}","","","",failed,exception`);
    }

    // small delay
    await sleep(900);
  });

  // run tasks with concurrency limit
  await runWithConcurrency(tasks, CONCURRENCY);
}

function runWithConcurrency(tasks, concurrency) {
  return new Promise((resolve) => {
    const results = new Array(tasks.length);
    let nextIndex = 0;
    let active = 0;

    function runNext() {
      if (nextIndex >= tasks.length && active === 0) {
        resolve(results);
        return;
      }
      while (active < concurrency && nextIndex < tasks.length) {
        const current = nextIndex++;
        active++;
        tasks[current]().then((res) => {
          results[current] = res;
        }).catch((err) => {
          results[current] = err;
        }).finally(() => {
          active--;
          runNext();
        });
      }
    }

    runNext();
  });
}

async function main() {
  console.log('Fetching products without images...');
  const { data: productsRaw, error } = await supabase
    .from('lats_products')
    .select('id, name, image_url')
    .eq('is_active', true)
    .eq('is_customer_portal_visible', true)
    .is('image_url', null);

  if (error) {
    console.error('Error fetching products:', error);
    process.exit(1);
  }

  const products = productsRaw || [];
  console.log(`Found ${products.length} products missing image_url`);

  for (let i = 0; i < products.length; i += BATCH) {
    const batch = products.slice(i, i + BATCH);
    console.log(`Processing batch ${i / BATCH + 1} (${batch.length} items)`);
    await processBatch(batch);
    // small pause between batches
    await sleep(1200);
  }

  console.log('Done.');
  process.exit(0);
}

main();


