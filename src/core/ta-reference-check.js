import * as books from '../core/books/books';
import { getFile } from '../core/getApi';
// import { consoleLogObject } from '../core/utilities';


const TA_REFERENCE_VALIDATOR_VERSION = '0.2.1';

const DEFAULT_EXTRACT_LENGTH = 10;


async function checkTAReference(fieldName, fieldText, givenLocation, optionalCheckingOptions) {
    // This is for the case of the full SupportReference field being the article link
    //  which is assumed to be in the translate part of the TA manual.

    // We fetch the TA link from Door43 to test that it's really there
    //  -- you can control this with:
    //      optionalCheckingOptions.taRepoUsername
    //      optionalCheckingOptions.taRepoBranch (or tag)
    //      optionalCheckingOptions.taRepoLanguageCode
    //      optionalCheckingOptions.taRepoSectionName

    // console.log(`checkTAReference v${TA_REFERENCE_VALIDATOR_VERSION} (${fieldName}, (${fieldText.length}) '${fieldText}', ${givenLocation}, …)`);
    console.assert(fieldName !== undefined, "checkTAReference: 'fieldText' parameter should be defined");
    console.assert(typeof fieldName === 'string', `checkTAReference: 'fieldText' parameter should be a string not a '${typeof fieldName}'`);
    console.assert(fieldText !== undefined, "checkTAReference: 'fieldText' parameter should be defined");
    console.assert(typeof fieldText === 'string', `checkTAReference: 'fieldText' parameter should be a string not a '${typeof fieldText}'`);
    console.assert(givenLocation !== undefined, "checkTAReference: 'fieldText' parameter should be defined");
    console.assert(typeof givenLocation === 'string', `checkTAReference: 'fieldText' parameter should be a string not a '${typeof givenLocation}'`);
    console.assert(fieldName === 'SupportReference', `Unexpected checkTAReference fieldName='${fieldName}'`); // so far

    let ourLocation = givenLocation;
    if (ourLocation && ourLocation[0] !== ' ') ourLocation = ` ${ourLocation}`;
    if (fieldName) ourLocation = ` in ${fieldName}${ourLocation}`;

    const ctarResult = { noticeList: [] };

    function addNotice6({priority,message, lineNumber,characterIndex, extract, location}) {
        // console.log(`checkTAReference Notice: (priority=${priority}) ${message}${characterIndex > 0 ? ` (at character ${characterIndex}${1})` : ""}${extract ? ` ${extract}` : ""}${location}`);
        console.assert(priority !== undefined, "cTAref addNotice6: 'priority' parameter should be defined");
        console.assert(typeof priority === 'number', `cTAref addNotice6: 'priority' parameter should be a number not a '${typeof priority}': ${priority}`);
        console.assert(message !== undefined, "cTAref addNotice6: 'message' parameter should be defined");
        console.assert(typeof message === 'string', `cTAref addNotice6: 'message' parameter should be a string not a '${typeof message}': ${message}`);
        // console.assert(characterIndex !== undefined, "cTAref addNotice6: 'characterIndex' parameter should be defined");
        if (characterIndex) console.assert(typeof characterIndex === 'number', `cTAref addNotice6: 'characterIndex' parameter should be a number not a '${typeof characterIndex}': ${characterIndex}`);
        // console.assert(extract !== undefined, "cTAref addNotice6: 'extract' parameter should be defined");
        if (extract) console.assert(typeof extract === 'string', `cTAref addNotice6: 'extract' parameter should be a string not a '${typeof extract}': ${extract}`);
        console.assert(location !== undefined, "cTAref addNotice6: 'location' parameter should be defined");
        console.assert(typeof location === 'string', `cTAref addNotice6: 'location' parameter should be a string not a '${typeof location}': ${location}`);
        ctarResult.noticeList.push({priority, message, lineNumber, characterIndex, extract, location});
    }


    // Main code for checkTAReference
    /*
    let extractLength;
    try {
        extractLength = optionalCheckingOptions.extractLength;
    } catch (trcELerror) { }
    if (typeof extractLength !== 'number' || isNaN(extractLength)) {
        extractLength = DEFAULT_EXTRACT_LENGTH;
        // console.log(`Using default extractLength=${extractLength}`);
    }
    // else
        // console.log(`Using supplied extractLength=${extractLength}`, "cf. default="+DEFAULT_EXTRACT_LENGTH);
    const halfLength = Math.floor(extractLength / 2); // rounded down
    const halfLengthPlus = Math.floor((extractLength + 1) / 2); // rounded up
    // console.log(`Using halfLength=${halfLength}`, "halfLengthPlus="+halfLengthPlus);
    */

    let username;
    try {
        username = optionalCheckingOptions.taRepoUsername;
    } catch (trcUNerror) { }
    if (!username) username = 'unfoldingWord'; // or Door43-Catalog ???
    let branch;
    try {
        branch = optionalCheckingOptions.taRepoBranch;
    } catch (trcBRerror) { }
    if (!branch) branch = 'master';
    let languageCode;
    try {
        languageCode = optionalCheckingOptions.taRepoLanguageCode;
    } catch (trcLCerror) { }
    if (!languageCode) languageCode = 'en';
    let sectionName;
    try {
        sectionName = optionalCheckingOptions.taRepoSectionName;
    } catch (trcSNerror) { }
    if (!sectionName) sectionName = 'translate';
    const taRepoName = `${languageCode}_ta`;
    const filepath = `${sectionName}/${fieldText}/01.md`; // Other files are title.md, sub-title.md

    // console.log(`Need to check against ${taRepoName}`);
    let taFileContent; // Not really used here -- just to show that we got something valid
    try {
        taFileContent = await getFile({ username, repository: taRepoName, path: filepath, branch });
        // console.log("Fetched fileContent for", taRepoName, filepath, typeof fileContent, fileContent.length);
    } catch (trcGCerror) {
        console.log("ERROR: Failed to load", username, taRepoName, filepath, branch, trcGCerror.message);
        addNotice6({priority:888, message:`Error loading ${fieldName} TA link`, extract:fieldText, location:`${ourLocation} ${filepath}: ${trcGCerror}`});
    }
    if (!taFileContent)
        addNotice6({priority:889, message:`Unable to find ${fieldName} TA link`, extract:fieldText, location:`${ourLocation} ${filepath}`});
    else if ( taFileContent.length < 10)
        addNotice6({priority:887, message:`Linked ${fieldName} TA article seems empty`, extract:fieldText, location:`${ourLocation} ${filepath}`});

    // console.log(`checkTAReference is returning ${JSON.stringify(ctarResult)}`);
    return ctarResult;
}
// end of checkTAReference function


export default checkTAReference;