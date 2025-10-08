// const fs = require('fs');
// const csv = require('csv-parser');
import fs from 'fs'
import csv from 'csv-parser'

function addNoiseToData(filePath, noiseRange, writePath) {
  const data = [];
  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (row) => data.push(row))
    .on('end', () => {

      for (let i = 1; i < data.length; i++) { // Skip the header row
        data[i]['1980'] = +(data[i]['1980']) + (Math.random()  + 1 / 2) * noiseRange;
        data[i]['1990'] = +(data[i]['1990']) + (Math.random()  + 1 / 2) * noiseRange;
        data[i]['2000'] = +(data[i]['2000']) + (Math.random()  + 1 / 2) * noiseRange;
        data[i]['2010'] = +(data[i]['2010']) + (Math.random()  + 1 / 2) * noiseRange;
        data[i]['2020'] = +(data[i]['2020']) + (Math.random()  + 1 / 2) * noiseRange;
        data[i]['2021'] = +(data[i]['2021']) + (Math.random()  + 1 / 2) * noiseRange;
        data[i]['2022'] = +(data[i]['2022']) + (Math.random()  + 1 / 2) * noiseRange;
      }
    
      const csvWriter = fs.createWriteStream(writePath);
      const _str = data.map((_row) => Object.values(_row).map((value) => value.toString()).reverse().join(','))
    
      
      const writeStream = csvWriter.write(_str.join('\n'))
    });
}

// Usage example
addNoiseToData('education.csv', 5, 'education_noisy.csv');