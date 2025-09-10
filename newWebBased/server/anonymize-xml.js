const fs = require('fs');
const path = require('path');

// List of dummy first names
const firstNamesMale = [
  'Alexander', 'Benjamin', 'Christopher', 'Daniel', 'Ethan', 'Felix', 'Gabriel', 'Henry',
  'Isaac', 'Jacob', 'Kevin', 'Liam', 'Michael', 'Nathan', 'Oliver', 'Patrick',
  'Quinn', 'Robert', 'Sebastian', 'Thomas', 'Ulrich', 'Vincent', 'William', 'Xavier',
  'Yannick', 'Zachary', 'Adrian', 'Bruno', 'Cedric', 'Dominic'
];

const firstNamesFemale = [
  'Anna', 'Bella', 'Clara', 'Diana', 'Emma', 'Fiona', 'Grace', 'Hannah',
  'Isabella', 'Julia', 'Kate', 'Luna', 'Maria', 'Nina', 'Olivia', 'Petra',
  'Quinn', 'Rosa', 'Sophia', 'Tina', 'Ursula', 'Victoria', 'Wendy', 'Xenia',
  'Yvonne', 'Zoe', 'Amy', 'Beth', 'Chloe', 'Dora'
];

const lastNames = [
  'Mueller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker',
  'Schulz', 'Hoffmann', 'Schaefer', 'Koch', 'Bauer', 'Richter', 'Klein', 'Wolf',
  'Schroeder', 'Neumann', 'Schwarz', 'Zimmermann', 'Braun', 'Krueger', 'Hofmann', 'Hartmann',
  'Lange', 'Schmitt', 'Werner', 'Schmitz', 'Krause', 'Meier', 'Lehmann', 'Huber'
];

// Counter for generating unique names
let nameCounter = 1;
const nameMapping = new Map();

function getAnonymizedName(originalName, gender) {
  if (nameMapping.has(originalName)) {
    return nameMapping.get(originalName);
  }
  
  const firstNames = gender === '1' ? firstNamesMale : firstNamesFemale;
  const firstName = firstNames[(nameCounter - 1) % firstNames.length];
  const lastName = lastNames[Math.floor((nameCounter - 1) / firstNames.length) % lastNames.length];
  
  const anonymizedName = `${firstName} ${lastName}`;
  nameMapping.set(originalName, anonymizedName);
  nameCounter++;
  
  return anonymizedName;
}

function anonymizeXML(content) {
  console.log('Starting XML anonymization...');
  
  // Replace espID with dummy data
  content = content.replace(/<espID>\d+<\/espID>/g, '<espID>1000001</espID>');
  
  // Find and replace names in participant entries
  // Pattern for perVorname and perName
  content = content.replace(/<TN[^>]*>[\s\S]*?<\/TN>/g, (match) => {
    let updatedMatch = match;
    
    // Extract gender first to determine name list
    const genderMatch = updatedMatch.match(/<perGeschlecht>(\d+)<\/perGeschlecht>/);
    const gender = genderMatch ? genderMatch[1] : '1';
    
    // Extract original names
    const vornameMatch = updatedMatch.match(/<perVorname>([^<]+)<\/perVorname>/);
    const nameMatch = updatedMatch.match(/<perName>([^<]+)<\/perName>/);
    
    if (vornameMatch && nameMatch) {
      const originalFullName = `${vornameMatch[1]} ${nameMatch[1]}`;
      const anonymizedName = getAnonymizedName(originalFullName, gender);
      const [newFirstName, newLastName] = anonymizedName.split(' ');
      
      updatedMatch = updatedMatch.replace(/<perVorname>[^<]+<\/perVorname>/, `<perVorname>${newFirstName}</perVorname>`);
      updatedMatch = updatedMatch.replace(/<perName>[^<]+<\/perName>/, `<perName>${newLastName}</perName>`);
    }
    
    return updatedMatch;
  });
  
  console.log('XML anonymization completed');
  return content;
}

function formatXML(content) {
  console.log('Formatting XML...');
  
  // Simple XML formatting - add proper indentation
  let formatted = content;
  let indent = 0;
  const indentStr = '  ';
  
  // Split by tags and process
  formatted = formatted.replace(/></g, '>\n<');
  const lines = formatted.split('\n');
  
  const formattedLines = [];
  for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    
    // Decrease indent for closing tags
    if (line.startsWith('</')) {
      indent = Math.max(0, indent - 1);
    }
    
    // Add indentation
    formattedLines.push(indentStr.repeat(indent) + line);
    
    // Increase indent for opening tags (but not self-closing or text content)
    if (line.startsWith('<') && !line.startsWith('</') && !line.endsWith('/>') && !line.includes('><')) {
      indent++;
    }
  }
  
  console.log('XML formatting completed');
  return formattedLines.join('\n');
}

function main() {
  const inputFile = 'WK-Gymnet-real.xml';
  const outputFile = 'WK-Gymnet-anonymized.xml';
  
  console.log(`Reading file: ${inputFile}`);
  
  try {
    // Read the original file
    const content = fs.readFileSync(inputFile, 'utf8');
    console.log(`File size: ${content.length} characters`);
    
    // Anonymize the content
    const anonymizedContent = anonymizeXML(content);
    
    // Format the XML
    const formattedContent = formatXML(anonymizedContent);
    
    // Write the anonymized and formatted file
    fs.writeFileSync(outputFile, formattedContent, 'utf8');
    
    console.log(`✅ Anonymized file created: ${outputFile}`);
    console.log(`📊 Generated ${nameCounter - 1} unique anonymized names`);
    
  } catch (error) {
    console.error('❌ Error processing file:', error.message);
  }
}

main();
