const fs = require('fs');
const { parseString } = require('xml2js');
const { promisify } = require('util');

async function examineTeamStructure() {
  try {
    const xmlPath = 'c:\\Users\\Dominik Prudlo\\Nextcloud_UG2\\Wettkämpfe\\Schüler und Jugendturnfest\\68\\WK-Gymnet(1).xml';
    const xmlContent = fs.readFileSync(xmlPath, 'utf-8');
    
    const parseXmlAsync = promisify(parseString);
    const parsedXml = await parseXmlAsync(xmlContent, {
      explicitArray: false,
      mergeAttrs: true,
      trim: true,
      normalize: false,
      normalizeTags: false,
      ignoreAttrs: false
    });
    
    function examineFirstCompetition(obj, path = '') {
      if (!obj || typeof obj !== 'object') return;
      
      if (obj.waID && obj.waNr && obj.Mannschaften) {
        console.log(`🏆 Competition ${obj.waNr}: ${obj.waBezeichnung || 'Unknown'}`);
        console.log(`   Mannschaften type:`, Array.isArray(obj.Mannschaften) ? 'Array' : typeof obj.Mannschaften);
        
        if (obj.Mannschaften.Mannschaft) {
          console.log(`   Mannschaft type:`, Array.isArray(obj.Mannschaften.Mannschaft) ? 'Array' : typeof obj.Mannschaften.Mannschaft);
          
          const firstTeam = Array.isArray(obj.Mannschaften.Mannschaft) ? obj.Mannschaften.Mannschaft[0] : obj.Mannschaften.Mannschaft;
          
          if (firstTeam) {
            console.log(`   First team keys:`, Object.keys(firstTeam));
            
            // Look for participants in the team
            if (firstTeam.Teilnehmer) {
              console.log(`     Teilnehmer type:`, Array.isArray(firstTeam.Teilnehmer) ? 'Array' : typeof firstTeam.Teilnehmer);
              
              if (firstTeam.Teilnehmer.TN) {
                console.log(`     TN type:`, Array.isArray(firstTeam.Teilnehmer.TN) ? 'Array' : typeof firstTeam.Teilnehmer.TN);
                
                const firstParticipant = Array.isArray(firstTeam.Teilnehmer.TN) ? firstTeam.Teilnehmer.TN[0] : firstTeam.Teilnehmer.TN;
                
                if (firstParticipant) {
                  console.log(`     First participant keys:`, Object.keys(firstParticipant));
                  console.log(`     Sample participant:`, {
                    name: firstParticipant.perName,
                    firstName: firstParticipant.perVorname,
                    birth: firstParticipant.perGeburt,
                    gender: firstParticipant.perGeschlecht
                  });
                }
              }
            }
          }
        }
        return true; // Found and examined
      }
      
      // Recursively search
      for (const key of Object.keys(obj)) {
        if (typeof obj[key] === 'object') {
          if (Array.isArray(obj[key])) {
            for (let i = 0; i < obj[key].length; i++) {
              if (examineFirstCompetition(obj[key][i], `${path}.${key}[${i}]`)) return true;
            }
          } else {
            if (examineFirstCompetition(obj[key], `${path}.${key}`)) return true;
          }
        }
      }
      return false;
    }
    
    examineFirstCompetition(parsedXml);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

examineTeamStructure();
