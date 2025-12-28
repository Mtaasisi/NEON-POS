#!/usr/bin/env node

/**
 * Apple Laptop Specifications Fetcher
 * Fetches and parses laptop specifications from Apple Support pages
 * Usage: node fetch-apple-specs.mjs [url]
 */

import https from 'https';
import { JSDOM } from 'jsdom';

// Default Apple Support URL for MacBook Air 13-inch M4 2025
const DEFAULT_URL = 'https://support.apple.com/en-us/122209';

class AppleSpecsFetcher {
    constructor() {
        this.url = process.argv[2] || DEFAULT_URL;
    }

    async fetchPage(url) {
        return new Promise((resolve, reject) => {
            https.get(url, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    resolve(data);
                });
            }).on('error', (err) => {
                reject(err);
            });
        });
    }

    parseSpecs(html) {
        const dom = new JSDOM(html);
        const document = dom.window.document;

        // Extract basic model information
        const title = document.querySelector('h1')?.textContent?.trim() || '';
        const modelMatch = title.match(/MacBook\s+(Air|Pro)\s+(.+)/i);
        const family = modelMatch ? modelMatch[1] : 'MacBook Air';
        const generation = modelMatch ? modelMatch[2] : 'Unknown';

        // Extract year introduced
        const yearElement = document.querySelector('[data-analytics-section-engagement="name:body"]');
        const yearText = yearElement?.textContent || '';
        const yearMatch = yearText.match(/Year introduced:\s*(\d{4})/i);
        const year = yearMatch ? yearMatch[1] : '2025';

        // Extract model number from URL or content
        const modelNumber = this.extractModelNumber(html);

        console.log(`📱 Parsing: ${family} ${generation} (${year})`);
        console.log(`🔢 Model Number: ${modelNumber}`);

        // Extract specifications from structured content
        const specs = {
            family: family,
            generation: generation,
            year: year,
            model_number: modelNumber,
            display: this.extractDisplaySpecs(document),
            processors: this.extractProcessorSpecs(document),
            memory: this.extractMemorySpecs(document),
            storage: this.extractStorageSpecs(document),
            battery: this.extractBatterySpecs(document),
            graphics: this.extractGraphicsSpecs(document),
            ports: this.extractPortsSpecs(document),
            connectivity: this.extractConnectivitySpecs(document),
            camera: this.extractCameraSpecs(document),
            audio: this.extractAudioSpecs(document),
            keyboard: this.extractKeyboardSpecs(document),
            weight: this.extractWeightSpecs(document),
            colors: this.extractColorSpecs(document),
            original_price_usd: this.extractPriceSpecs(document)
        };

        // Clean up empty arrays/objects
        Object.keys(specs).forEach(key => {
            if (Array.isArray(specs[key]) && specs[key].length === 0) {
                delete specs[key];
            } else if (typeof specs[key] === 'object' && specs[key] !== null) {
                const obj = specs[key];
                if (Object.values(obj).every(v => !v || (Array.isArray(v) && v.length === 0))) {
                    delete specs[key];
                }
            } else if (!specs[key] || specs[key] === '') {
                delete specs[key];
            }
        });

        return specs;
    }

    extractModelNumber(html) {
        // Try to find model number in various formats
        const patterns = [
            /MacBook\s+(Air|Pro)\s+(.+?)\s*\(/gi,
            /Model\s+[A-Z]\d{4}/gi,
            /A\d{4}/g
        ];

        for (const pattern of patterns) {
            const matches = html.match(pattern);
            if (matches && matches.length > 0) {
                // Extract model number from the first match
                const match = matches[0];
                const modelMatch = match.match(/A\d{4}/);
                if (modelMatch) {
                    return modelMatch[0];
                }
            }
        }

        // Default fallback
        return 'AXXXX';
    }

    extractDisplaySpecs(document) {
        const displaySection = this.findSectionByHeading(document, 'Display');
        if (!displaySection) return {};

        const text = displaySection.textContent || '';
        const size = text.match(/(\d+(?:\.\d+)?)-inch/i)?.[1] + '-inch' || '';
        const type = text.includes('Liquid Retina') ? 'Liquid Retina display' :
                    text.includes('Retina') ? 'Retina display' : '';
        const resolution = text.match(/(\d+\s*x\s*\d+)/i)?.[1] || '';

        return { size, type, resolution };
    }

    extractProcessorSpecs(document) {
        const chipSection = this.findSectionByHeading(document, 'Chip');
        if (!chipSection) return [];

        const text = chipSection.textContent || '';
        const processors = [];

        // Extract Apple Silicon chips
        const mChipMatch = text.match(/Apple\s+M\d+/gi);
        if (mChipMatch) {
            processors.push(...mChipMatch);
        }

        // Extract Intel chips
        const intelMatch = text.match(/Intel\s+Core\s+i\d+/gi);
        if (intelMatch) {
            processors.push(...intelMatch);
        }

        return processors;
    }

    extractMemorySpecs(document) {
        const memorySection = this.findSectionByHeading(document, 'Memory');
        if (!memorySection) return [];

        const text = memorySection.textContent || '';
        const memory = [];

        // Extract memory options
        const memMatches = text.match(/(\d+GB)/gi);
        if (memMatches) {
            memory.push(...memMatches);
        }

        return [...new Set(memory)]; // Remove duplicates
    }

    extractStorageSpecs(document) {
        const storageSection = this.findSectionByHeading(document, 'Storage');
        if (!storageSection) return [];

        const text = storageSection.textContent || '';
        const storage = [];

        // Extract storage options
        const storageMatches = text.match(/(\d+TB|\d+GB)/gi);
        if (storageMatches) {
            storage.push(...storageMatches);
        }

        return [...new Set(storage)]; // Remove duplicates
    }

    extractBatterySpecs(document) {
        const batterySection = this.findSectionByHeading(document, 'Battery and Power');
        if (!batterySection) return '';

        const text = batterySection.textContent || '';
        const batteryMatch = text.match(/Up to (\d+ hours?)/i);
        return batteryMatch ? `Up to ${batteryMatch[1]}` : '';
    }

    extractGraphicsSpecs(document) {
        const chipSection = this.findSectionByHeading(document, 'Chip');
        if (!chipSection) return '';

        const text = chipSection.textContent || '';
        const gpuMatch = text.match(/(\d+-core GPU)/i);
        return gpuMatch ? `Apple M4 GPU (${gpuMatch[1]})` : '';
    }

    extractPortsSpecs(document) {
        const portsSection = this.findSectionByHeading(document, 'Charging and Expansion');
        if (!portsSection) return [];

        const text = portsSection.textContent || '';
        const ports = [];

        if (text.includes('Thunderbolt')) {
            ports.push('Thunderbolt 4 (USB-C) ports');
        }
        if (text.includes('headphone jack')) {
            ports.push('3.5mm headphone jack');
        }
        if (text.includes('MagSafe')) {
            ports.push('MagSafe 3 charging port');
        }

        return ports;
    }

    extractConnectivitySpecs(document) {
        const wirelessSection = this.findSectionByHeading(document, 'Wireless');
        if (!wirelessSection) return [];

        const text = wirelessSection.textContent || '';
        const connectivity = [];

        if (text.includes('Wi-Fi 6E')) {
            connectivity.push('Wi-Fi 6E');
        } else if (text.includes('Wi-Fi 6')) {
            connectivity.push('Wi-Fi 6');
        }

        if (text.includes('Bluetooth 5.3')) {
            connectivity.push('Bluetooth 5.3');
        } else if (text.includes('Bluetooth 5')) {
            connectivity.push('Bluetooth 5.0');
        }

        return connectivity;
    }

    extractCameraSpecs(document) {
        const cameraSection = this.findSectionByHeading(document, 'Camera');
        if (!cameraSection) return '';

        const text = cameraSection.textContent || '';
        if (text.includes('1080p')) {
            return '1080p FaceTime HD';
        } else if (text.includes('720p')) {
            return '720p FaceTime HD';
        }
        return '';
    }

    extractAudioSpecs(document) {
        const audioSection = this.findSectionByHeading(document, 'Audio');
        if (!audioSection) return '';

        const text = audioSection.textContent || '';
        if (text.includes('six-speaker')) {
            return 'Six-speaker system with Dolby Atmos';
        } else if (text.includes('four-speaker')) {
            return 'Four-speaker system with Dolby Atmos';
        } else if (text.includes('stereo')) {
            return 'Stereo speakers';
        }
        return '';
    }

    extractKeyboardSpecs(document) {
        const keyboardSection = this.findSectionByHeading(document, 'Keyboard and Trackpad');
        if (!keyboardSection) return '';

        const text = keyboardSection.textContent || '';
        if (text.includes('Touch ID')) {
            return 'Magic Keyboard with Touch ID';
        } else if (text.includes('Magic Keyboard')) {
            return 'Magic Keyboard';
        }
        return '';
    }

    extractWeightSpecs(document) {
        const sizeSection = this.findSectionByHeading(document, 'Size and Weight');
        if (!sizeSection) return '';

        const text = sizeSection.textContent || '';
        const weightMatch = text.match(/(\d+(?:\.\d+)?)\s*pounds?/i);
        return weightMatch ? `${weightMatch[1]} pounds` : '';
    }

    extractColorSpecs(document) {
        const finishSection = this.findSectionByHeading(document, 'Finish');
        if (!finishSection) return [];

        const text = finishSection.textContent || '';
        const colors = [];

        // Common Apple colors
        const colorList = ['Space Gray', 'Silver', 'Gold', 'Midnight', 'Starlight', 'Blue', 'Green', 'Pink'];
        colorList.forEach(color => {
            if (text.includes(color)) {
                colors.push(color);
            }
        });

        return colors;
    }

    extractPriceSpecs(document) {
        // This would typically be found in the "Configure to Order" section
        // For now, return null as prices vary
        return null;
    }

    findSectionByHeading(document, heading) {
        const headings = document.querySelectorAll('h2, h3, h4, h5, h6');
        for (const h of headings) {
            if (h.textContent.toLowerCase().includes(heading.toLowerCase())) {
                return h.parentElement || h.nextElementSibling;
            }
        }
        return null;
    }

    async run() {
        try {
            console.log(`🌐 Fetching specifications from: ${this.url}`);
            const html = await this.fetchPage(this.url);
            const specs = this.parseSpecs(html);

            console.log('\n✅ Successfully extracted specifications:');
            console.log(JSON.stringify(specs, null, 2));

            return specs;
        } catch (error) {
            console.error('❌ Error fetching specifications:', error.message);
            return null;
        }
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const fetcher = new AppleSpecsFetcher();
    fetcher.run().then(specs => {
        if (specs) {
            console.log('\n💡 Tip: Copy the JSON above and paste it into your database!');
        }
    });
}

export default AppleSpecsFetcher;
