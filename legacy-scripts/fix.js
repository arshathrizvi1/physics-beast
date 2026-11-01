const fs = require('fs');

// Fix page.tsx
const pageFile = 'C:\\Projects\\Brilliant Academy\\physics-beast\\src\\app\\login\\page.tsx';
let pageContent = fs.readFileSync(pageFile, 'utf8');

// Remove the duplicated lines 335 and 336
pageContent = pageContent.replace(
  'const selectedBatch = batches.find(b => b.year === graduationYear || b.id === graduationYear);\n          const isALBatch = selectedBatch?.isAL === true;\n          let isAiApproved = false;\n          if (isALBatch && nicFile && nicNumber.trim()) {',
  'let isAiApproved = false;\n          if (isALBatch && nicFile && nicNumber.trim()) {'
);

fs.writeFileSync(pageFile, pageContent);

// Fix route.ts
const routeFile = 'C:\\Projects\\Brilliant Academy\\physics-beast\\src\\app\\api\\verify-nic\\route.ts';
let routeContent = fs.readFileSync(routeFile, 'utf8');

const badPrompt = '    const prompt = \\\n' +
'You are an expert identity verification system for Sri Lankan NIC cards.\n' +
'The user provided:\n' +
'Name: "\"\n' +
'NIC Number: "\"\n' +
'\n' +
'Attached is an image of their ID card.\n' +
'\n' +
'Rules for Verification:\n' +
'1. Read the NIC number from the image and check if it exactly matches "\" (ignoring spaces/case).\n' +
'2. Read the Name from the image and check if it is a reasonable match for "\". It doesn\'t have to be exact. Initials like "M.R.M. Arshad" matching "Mohammed Rispi Mohamed Arshad" are considered a MATCH. "Arshath" matching "Arshad" is a MATCH.\n' +
'3. Check the birth year. Sri Lankan NIC numbers contain the birth year (either the first two digits for old NICs, e.g. "06xxxxxxxV" means 2006, or the first four digits for new NICs, e.g. "2006xxxxxx"). The birth year MUST be strictly greater than 2005 (e.g. 2006, 2007, 2008...).\n' +
'\n' +
'If ALL three rules pass, respond with exactly: "APPROVED"\n' +
'If any rule fails, respond with exactly: "REJECTED: [Reason]"\n' +
'\\;';

const goodPrompt = '    const prompt = \n' +
'You are an expert identity verification system for Sri Lankan NIC cards.\n' +
'The user provided:\n' +
'Name: "\"\n' +
'NIC Number: "\"\n' +
'\n' +
'Attached is an image of their ID card.\n' +
'\n' +
'Rules for Verification:\n' +
'1. Read the NIC number from the image and check if it exactly matches "\" (ignoring spaces/case).\n' +
'2. Read the Name from the image and check if it is a reasonable match for "\". It doesn\\'t have to be exact. Initials like "M.R.M. Arshad" matching "Mohammed Rispi Mohamed Arshad" are considered a MATCH. "Arshath" matching "Arshad" is a MATCH.\n' +
'3. Check the birth year. Sri Lankan NIC numbers contain the birth year (either the first two digits for old NICs, e.g. "06xxxxxxxV" means 2006, or the first four digits for new NICs, e.g. "2006xxxxxx"). The birth year MUST be strictly greater than 2005 (e.g. 2006, 2007, 2008...).\n' +
'\n' +
'If ALL three rules pass, respond with exactly: "APPROVED"\n' +
'If any rule fails, respond with exactly: "REJECTED: [Reason]"\n' +
';';

routeContent = routeContent.replace(badPrompt, goodPrompt);
fs.writeFileSync(routeFile, routeContent);