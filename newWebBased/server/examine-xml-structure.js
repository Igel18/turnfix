const fs = require('fs');
const { parseString } = require('xml2js');
const { promisify } = require('util');

async function examineXMLStructure() {
  try {
    const xmlPath = 'c:\\Users\\Dominik Prudlo\\Nextcloud_UG2\\Wettkämpfe\\Schüler und Jugendturnfest\\68\\WK-Gymnet(1).xml';
    const xmlContent = fs.readFileSync(xmlPath, 'utf-8');
    
    // Parse XML
    const parseXmlAsync = promisify(parseString);
    const parsedXml = await parseXmlAsync(xmlContent, {
      explicitArray: false,
      mergeAttrs: true,
      trim: true,
      normalize: false,
      normalizeTags: false,
      ignoreAttrs: false
    });
    
    // Look at the first competition in detail
    function findFirstCompetition(obj, path = '') {
      if (!obj || typeof obj !== 'object') return null;
      
      if (obj.waID && obj.waNr) {
        console.log(`🔍 Competition structure at ${path}:`);
        console.log('  Keys:', Object.keys(obj));
        
        // Look for participant-related keys
        Object.keys(obj).forEach(key => {
          if (key.toLowerCase().includes('teilnehmer') || 
              key.toLowerCase().includes('tn') ||
              key.toLowerCase().includes('participant')) {
            console.log(`  🎯 Found participant key: ${key}`);
            console.log(`     Type: ${Array.isArray(obj[key]) ? 'Array' : typeof obj[key]}`);
            if (obj[key] && typeof obj[key] === 'object') {
              console.log(`     Sub-keys:`, Object.keys(obj[key]));
              
              // If it has TN, look at TN structure
              if (obj[key].TN) {
                console.log(`     TN Type: ${Array.isArray(obj[key].TN) ? 'Array' : typeof obj[key].TN}`);
                if (obj[key].TN && typeof obj[key].TN === 'object') {
                  const firstTN = Array.isArray(obj[key].TN) ? obj[key].TN[0] : obj[key].TN;
                  if (firstTN) {
                    console.log(`     First TN keys:`, Object.keys(firstTN));
                  }
                }
              }
            }
          }
        });
        
        return obj; // Return the first competition found
      }
      
      // Recursively search
      for (const key of Object.keys(obj)) {
        if (typeof obj[key] === 'object') {
          if (Array.isArray(obj[key])) {
            for (let i = 0; i < obj[key].length; i++) {
              const result = findFirstCompetition(obj[key][i], `${path}.${key}[${i}]`);
              if (result) return result;
            }
          } else {
            const result = findFirstCompetition(obj[key], `${path}.${key}`);
            if (result) return result;
          }
        }
      }
      return null;
    }
    
    console.log('🔍 Examining first competition structure...');
    const firstComp = findFirstCompetition(parsedXml);
    
    if (!firstComp) {
      console.log('❌ No competition found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

examineXMLStructure();
