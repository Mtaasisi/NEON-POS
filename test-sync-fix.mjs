import { DataSyncService } from './src/lib/dataSync.ts';

async function testSync() {
  console.log('🧪 Testing data synchronization after column fixes...\n');

  try {
    const dataSync = new DataSyncService();

    console.log('🔄 Starting data sync...');
    await dataSync.sync();

    console.log('✅ Data sync completed successfully!');
    console.log('🎉 No column errors detected - fixes are working!');

  } catch (error) {
    console.error('❌ Sync test failed:', error.message);

    if (error.message.includes('column') && error.message.includes('does not exist')) {
      console.error('🔍 Column error still exists - fix may need adjustment');
    } else {
      console.error('🔍 Unexpected error during sync test');
    }

    process.exit(1);
  }
}

testSync();
