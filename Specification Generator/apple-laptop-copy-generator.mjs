import { readFileSync } from 'fs';

class AppleLaptopCopyGenerator {
  constructor() {
    this.database = JSON.parse(readFileSync('apple-laptops-database.json', 'utf8'));
  }

  getModelInfo(modelNumber) {
    const model = this.database.models[modelNumber];
    if (!model) {
      throw new Error(`Model ${modelNumber} not found in database`);
    }
    return model;
  }

    generateSalesCopy(modelNumber, userSpecs = {}) {
        const model = this.getModelInfo(modelNumber);

        // Extract user-provided specs
        const userRAM = userSpecs.ram;
        const userStorage = userSpecs.storage;
        const userCondition = userSpecs.condition || 'Used – Clean as New';
        const userExtras = userSpecs.extras || [];
        const userPrice = userSpecs.price;

        // Get model display name
        const modelDisplayName = this.getModelDisplayName(model, modelNumber);

        // Build the copy in the requested format
        let copy = `🔥 ${model.family.toUpperCase()} ${model.display.size.split('"')[0]}" (${this.getProcessorDisplayName(model.processors[0])}) 💻

📌 Quick Overview

• Model: ${model.family} ${model.model_number || modelNumber}
• Year: ${model.year}
• Condition: ${userCondition}
• Operating System: macOS (Latest supported)

⸻

⚙️ Performance (Fast & Smooth)

• Processor: ${this.getProcessorDisplayName(model.processors[0])}`;

        if (userRAM) {
            copy += `\n• Memory: ${userRAM} RAM (Smooth multitasking)`;
        }

        if (userStorage) {
            copy += `\n• Storage: ${userStorage} SSD (Very fast boot & apps)`;
        }

        // Display section
        copy += `

⸻

🖥 Display & Graphics

• ${model.display.size} ${model.display.type} (Sharp & clear)`;

        // Add display features if available
        if (model.display.features && model.display.features.length > 0) {
            model.display.features.forEach(feature => {
                copy += `\n• ${feature}`;
            });
        }

        copy += `\n• ${this.getGraphicsDisplayName(model.graphics)}`;

        // Battery section
        copy += `

⸻

🔋 Battery & Daily Use

• Battery condition: Good
• ${this.getBatteryDescription(model.battery)}`;

        // Ports & Connectivity
        copy += `

⸻

🔌 Ports & Connectivity

${this.formatPorts(model.ports)}
• Wi-Fi & Bluetooth`;

        // Keyboard, Camera & Sound
        copy += `

⸻

⌨️ Keyboard, Camera & Sound

• ${model.keyboard.includes('Magic') ? 'Magic Keyboard' : model.keyboard} (Comfortable typing)`;

        // Add Touch Bar for MacBook Pro models
        if (model.family === 'MacBook Pro' && model.display.size.includes('13')) {
            copy += `\n• Touch Bar (Smart controls above keyboard)`;
        }

        if (model.keyboard.includes('Touch ID')) {
            copy += `\n• Touch ID (Fingerprint unlock)`;
        }

        copy += `\n• ${model.camera.replace('FaceTime HD', 'FaceTime HD Camera')}`;
        copy += `\n• ${this.getAudioDescription(model.audio)}`;

        // Included accessories
        if (userExtras && userExtras.length > 0) {
            copy += `

⸻

📦 Included

${userExtras.map(extra => `• ${extra} ${extra.toLowerCase().includes('charger') ? '🔌' : ''}`).join('\n')}`;
        }

        // Best for section
        copy += `

⸻

✅ BEST FOR (Beginner Friendly)

${this.getBestForSection(model).map(item => `✔ ${item}`).join('\n')}`;

        // Price
        if (userPrice) {
            copy += `

⸻

💰 PRICE: ${userPrice}`;
        }

        // Contact info
        copy += `

📞 0712378850 OR 0769601663 Call / WhatsApp to order
📍 Available in Dar es Salaam (Mwenge) & Arusha (Triple A)`;

        return copy;
    }

    getModelDisplayName(model, modelNumber) {
        // Extract screen size and key features
        const screenSize = model.display.size.split('"')[0];
        const processor = this.getProcessorDisplayName(model.processors[0]);
        return `${model.family} ${screenSize}" (${processor})`;
    }

    getProcessorDisplayName(processor) {
        if (processor.includes('Apple M1 Max')) {
            return 'Apple M1 Max';
        } else if (processor.includes('Apple M1 Pro')) {
            return 'Apple M1 Pro';
        } else if (processor.includes('Apple M1')) {
            return 'Apple M1 Chip';
        } else if (processor.includes('Apple M2 Max')) {
            return 'Apple M2 Max';
        } else if (processor.includes('Apple M2 Pro')) {
            return 'Apple M2 Pro';
        } else if (processor.includes('Apple M2')) {
            return 'Apple M2 Chip';
        } else if (processor.includes('Intel Core i5')) {
            return 'Intel Core i5';
        } else if (processor.includes('Intel Core i7')) {
            return 'Intel Core i7';
        } else if (processor.includes('Intel Core i9')) {
            return 'Intel Core i9';
        }
        return processor.split('(')[0].trim();
    }

    getGraphicsDisplayName(graphics) {
        if (graphics.includes('Apple M1') || graphics.includes('Apple M2')) {
            return 'Integrated Apple GPU';
        } else if (graphics.includes('Intel Iris')) {
            return 'Intel Iris Plus Graphics';
        } else if (graphics.includes('Intel UHD')) {
            return 'Intel UHD Graphics';
        } else if (graphics.includes('AMD Radeon')) {
            return 'AMD Radeon Graphics';
        }
        return graphics;
    }

    getBatteryDescription(battery) {
        // Convert battery life to user-friendly description
        if (battery.includes('18 hours') || battery.includes('20 hours') || battery.includes('21 hours') || battery.includes('22 hours')) {
            return 'Excellent battery life for all-day work';
        } else if (battery.includes('12 hours') || battery.includes('11 hours')) {
            return 'Good battery life for daily tasks';
        } else {
            return 'Reliable battery life for daily work';
        }
    }

    formatPorts(ports) {
        const portMap = {
            'Two Thunderbolt / USB 4 ports': '2 × Thunderbolt 4 (USB-C)',
            'Two Thunderbolt 3 (USB-C) ports': '2 × Thunderbolt 3 (USB-C)',
            'Four Thunderbolt 3 ports': '4 × Thunderbolt 3 (USB-C)',
            'Three Thunderbolt 4 ports': '3 × Thunderbolt 4 (USB-C)',
            'One USB-C port': '1 × USB-C',
        };

        let formattedPorts = [];
        ports.forEach(port => {
            if (portMap[port]) {
                formattedPorts.push(`• ${portMap[port]}`);
            } else if (port.includes('MagSafe')) {
                formattedPorts.push(`• MagSafe Charging Port`);
            } else if (port.includes('HDMI')) {
                formattedPorts.push(`• HDMI Port`);
            } else if (port.includes('SDXC')) {
                formattedPorts.push(`• SD Card Slot`);
            } else if (port.includes('3.5mm')) {
                formattedPorts.push(`• 3.5mm Headphone Jack`);
            } else {
                formattedPorts.push(`• ${port}`);
            }
        });

        return formattedPorts.join('\n');
    }

    getAudioDescription(audio) {
        if (audio.includes('Six-speaker')) {
            return 'Six-speaker system with Dolby Atmos';
        } else if (audio.includes('Four-speaker')) {
            return 'Four-speaker system with Dolby Atmos';
        } else if (audio.includes('Stereo speakers')) {
            return 'Stereo Speakers';
        }
        return audio;
    }

    getBestForSection(model) {
    const bestFor = [];

    if (model.family === 'MacBook Air') {
      bestFor.push('Students and educators');
      bestFor.push('Remote workers and freelancers');
      if (model.display.size.includes('15')) {
        bestFor.push('Content creators (video editing, design)');
      } else {
        bestFor.push('Content creators (blogging, photo editing basics)');
      }
      bestFor.push('Anyone needing a reliable, fast laptop for daily use');
    } else if (model.family === 'MacBook Pro') {
      if (model.display.size.includes('14') || model.display.size.includes('16')) {
        bestFor.push('Professional content creators');
        bestFor.push('Video editors and 3D artists');
        bestFor.push('Software developers');
        bestFor.push('Creative professionals');
      } else {
        bestFor.push('Students and educators');
        bestFor.push('Business professionals');
        bestFor.push('Content creators');
        bestFor.push('Power users');
      }
    } else if (model.family === 'MacBook') {
      bestFor.push('Students and basic users');
      bestFor.push('Web browsing and light productivity');
      bestFor.push('Users transitioning from Windows to macOS');
      bestFor.push('Ultra-portable computing needs');
    }

    bestFor.push('Users transitioning from Windows to macOS');
    return bestFor;
  }

  searchModels(criteria) {
    let results = Object.keys(this.database.models);

    if (criteria.family) {
      results = results.filter(model =>
        this.database.models[model].family === criteria.family
      );
    }

    if (criteria.year) {
      results = results.filter(model =>
        this.database.models[model].year.includes(criteria.year.toString())
      );
    }

    if (criteria.screenSize) {
      results = results.filter(model =>
        this.database.models[model].display.size.includes(criteria.screenSize)
      );
    }

    if (criteria.chip) {
      results = results.filter(model =>
        this.database.models[model].processors.some(proc =>
          proc.includes(criteria.chip)
        )
      );
    }

    return results.map(model => ({
      modelNumber: model,
      ...this.database.models[model]
    }));
  }

  listAllModels() {
    return Object.keys(this.database.models).map(model => ({
      modelNumber: model,
      family: this.database.models[model].family,
      generation: this.database.models[model].generation,
      year: this.database.models[model].year
    }));
  }
}

// CLI usage - run when this file is executed directly
const generator = new AppleLaptopCopyGenerator();
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('Usage:');
  console.log('  node apple-laptop-copy-generator.mjs <model> [ram] [storage] [condition] [extras] [price]');
  console.log('  node apple-laptop-copy-generator.mjs list');
  console.log('  node apple-laptop-copy-generator.mjs search <criteria>');
  console.log('\nExamples:');
  console.log('  node apple-laptop-copy-generator.mjs A2259 16GB 512GB "Used, clean as new" "Charger" "1,300,000 TSH"');
  console.log('  node apple-laptop-copy-generator.mjs list');
  process.exit(1);
}

const command = args[0];

if (command === 'list') {
  const models = generator.listAllModels();
  console.log('Available Apple Laptop Models:');
  models.forEach(model => {
    console.log(`${model.modelNumber}: ${model.family} ${model.generation}`);
  });
} else if (command === 'search') {
  const criteria = {};
  for (let i = 1; i < args.length; i += 2) {
    if (args[i] && args[i+1]) {
      criteria[args[i]] = args[i+1];
    }
  }
  const results = generator.searchModels(criteria);
  console.log(`Found ${results.length} matching models:`);
  results.forEach(model => {
    console.log(`${model.modelNumber}: ${model.family} ${model.generation}`);
  });
} else {
  // Generate copy
  const modelNumber = command;
  const userSpecs = {
    ram: args[1],
    storage: args[2],
    condition: args[3],
    extras: args[4] ? args[4].split(',').map(e => e.trim()) : [],
    price: args[5]
  };

  try {
    const copy = generator.generateSalesCopy(modelNumber, userSpecs);
    console.log(copy);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    console.log('\nAvailable models:');
    const models = generator.listAllModels();
    models.forEach(model => {
      console.log(`${model.modelNumber}: ${model.family} ${model.generation}`);
    });
  }
}

export default AppleLaptopCopyGenerator;
