import * as books from './books/books';
import checkTextField from './field-text-check';
import checkMarkdownText from './markdown-text-check';
import checkTAReference from './ta-reference-check';
import checkTNLinks from './tn-links-check';
import checkOriginalLanguageQuote from './quote-check';


// const TN_TABLE_ROW_VALIDATOR_VERSION_STRING = '0.4.2';

const NUM_EXPECTED_TN_TSV_FIELDS = 9; // so expects 8 tabs per line
const EXPECTED_TN_HEADING_LINE = 'Book\tChapter\tVerse\tID\tSupportReference\tOrigQuote\tOccurrence\tGLQuote\tOccurrenceNote';

const DEFAULT_EXTRACT_LENGTH = 10;


async function checkTN_TSVDataRow(line, bookID, C, V, givenRowLocation, optionalCheckingOptions) {
    /**
    * @description - Checks one TSV data row of translation notes (TN)
    * @param {String} line - the TSV line to be checked
    * @param {String} bookID - 3-character UPPERCASE USFM book identifier
    * @param {String} C - chapter number string
    * @param {String} V - verse number string
    * @param {String} givenRowLocation - description of where the line is located
    * @param {Object} optionalCheckingOptions - may contain extractLength parameter
    * @return {Object} - containing noticeList
    */
    /* This function is only for checking one data row
          and the function doesn't assume that it has any previous context.

        It's designed to be able to quickly show errors for a single row being displayed/edited.

        Returns an object containing the noticeList.
    */
    // console.log(`checkTN_TSVDataRow(${bookID}, ${line}, ${givenRowLocation}, ${JSON.stringify(optionalCheckingOptions)})…`);
    console.assert(line !== undefined, "checkTN_TSVDataRow: 'line' parameter should be defined");
    console.assert(typeof line === 'string', `checkTN_TSVDataRow: 'line' parameter should be a string not a '${typeof line}'`);
    console.assert(bookID !== undefined, "checkTN_TSVDataRow: 'bookID' parameter should be defined");
    console.assert(typeof bookID === 'string', `checkTN_TSVDataRow: 'bookID' parameter should be a string not a '${typeof bookID}'`);
    console.assert(bookID.length === 3, `checkTN_TSVDataRow: 'bookID' parameter should be three characters long not ${bookID.length}`);
    console.assert(books.isValidBookID(bookID), `checkTN_TSVDataRow: '${bookID}' is not a valid USFM book identifier`);
    // console.assert(C !== undefined, "checkTN_TSVDataRow: 'C' parameter should be defined");
    if (C) console.assert(typeof C === 'string', `checkTN_TSVDataRow: 'C' parameter should be a string not a '${typeof C}'`);
    // console.assert(V !== undefined, "checkTN_TSVDataRow: 'V' parameter should be defined");
    if (V) console.assert(typeof V === 'string', `checkTN_TSVDataRow: 'V' parameter should be a string not a '${typeof V}'`);
    console.assert(givenRowLocation !== undefined, "checkTN_TSVDataRow: 'givenRowLocation' parameter should be defined");
    console.assert(typeof givenRowLocation === 'string', `checkTN_TSVDataRow: 'givenRowLocation' parameter should be a string not a '${typeof givenRowLocation}'`);

    let ourRowLocation = givenRowLocation;
    if (ourRowLocation && ourRowLocation[0] !== ' ') ourRowLocation = ` ${ourRowLocation}`;

    let drResult = { noticeList: [] };

    function addNotice6to9(noticeObject) {
        /**
        * @description - adds a new notice entry, adding bookID,C,V to the given fields
        * @param {Number} priority - notice priority from 1 (lowest) to 999 (highest)
        * @param {String} message - the text of the notice message
        * @param {String} rowID - 4-character row ID field
        * @param {Number} lineNumber - one-based line number
        * @param {Number} characterIndex - zero-based index of where the issue occurs in the line
        * @param {String} extract - short extract from the line centred on the problem (if available)
        * @param {String} location - description of where the issue is located
        */
        // console.log(`Annotation TSV Row Notice: (priority=${priority}) ${message}, ${characterIndex}, ${extract}, ${location}`);
        console.assert(noticeObject.priority !== undefined, "cTSVrow addNotice6to9: 'priority' parameter should be defined");
        console.assert(typeof noticeObject.priority === 'number', `cTSVrow addNotice6to9: 'priority' parameter should be a number not a '${typeof noticeObject.priority}': ${noticeObject.priority}`);
        console.assert(noticeObject.message !== undefined, "cTSVrow addNotice6to9: 'message' parameter should be defined");
        console.assert(typeof noticeObject.message === 'string', `cTSVrow addNotice6to9: 'message' parameter should be a string not a '${typeof noticeObject.message}': ${noticeObject.message}`);
        // console.assert(lineNumber !== undefined, "cTSVrow addNotice6to9: 'lineNumber' parameter should be defined");
        // console.assert(typeof lineNumber === 'number', `cTSVrow addNotice6to9: 'lineNumber' parameter should be a number not a '${typeof lineNumber}': ${lineNumber}`);
        // console.assert(characterIndex !== undefined, "cTSVrow addNotice6to9: 'characterIndex' parameter should be defined");
        if (noticeObject.characterIndex) console.assert(typeof noticeObject.characterIndex === 'number', `cTSVrow addNotice6to9: 'characterIndex' parameter should be a number not a '${typeof noticeObject.characterIndex}': ${noticeObject.characterIndex}`);
        // console.assert(extract !== undefined, "cTSVrow addNotice6to9: 'extract' parameter should be defined");
        if (noticeObject.extract) console.assert(typeof noticeObject.extract === 'string', `cTSVrow addNotice6to9: 'extract' parameter should be a string not a '${typeof noticeObject.extract}': ${noticeObject.extract}`);
        console.assert(noticeObject.location !== undefined, "cTSVrow addNotice6to9: 'location' parameter should be defined");
        console.assert(typeof noticeObject.location === 'string', `cTSVrow addNotice6to9: 'location' parameter should be a string not a '${typeof noticeObject.location}': ${noticeObject.location}`);
        // Also uses the given bookID,C,V, parameters from the main function call
        drResult.noticeList.push({ ...noticeObject, bookID, C, V });
    }

    function ourMarkdownTextChecks(rowID, fieldName, fieldText, allowedLinks, rowLocation, optionalCheckingOptions) {
        /**
        * @description - checks the given markdown field and processes the returned results
        * @param {String} rowID - 4-character row ID field
        * @param {String} fieldName - name of the field being checked
        * @param {String} fieldText - the actual text of the field being checked
        * @param {} allowedLinks - true if links are allowed in the field, otherwise false
        * @param {String} rowLocation - description of where the line is located
        * @param {Object} optionalCheckingOptions - parameters that might affect the check
        */
        // Does markdown checks for small errors like leading/trailing spaces, etc.

        // We assume that checking for compulsory fields is done elsewhere

        // Updates the global list of notices

        // We don't currently use the allowedLinks parameter

        // console.log(`cTSVrow ourCheckTextField(${fieldName}, (${fieldText.length}), ${allowedLinks}, ${rowLocation}, …)`);
        console.assert(rowID !== undefined, "cTSVrow ourMarkdownTextChecks: 'rowID' parameter should be defined");
        console.assert(typeof rowID === 'string', `cTSVrow ourMarkdownTextChecks: 'rowID' parameter should be a string not a '${typeof rowID}'`);
        console.assert(fieldName !== undefined, "cTSVrow ourMarkdownTextChecks: 'fieldName' parameter should be defined");
        console.assert(typeof fieldName === 'string', `cTSVrow ourMarkdownTextChecks: 'fieldName' parameter should be a string not a '${typeof fieldName}'`);
        console.assert(fieldText !== undefined, "cTSVrow ourMarkdownTextChecks: 'fieldText' parameter should be defined");
        console.assert(typeof fieldText === 'string', `cTSVrow ourMarkdownTextChecks: 'fieldText' parameter should be a string not a '${typeof fieldText}'`);
        console.assert(allowedLinks === true || allowedLinks === false, "cTSVrow ourMarkdownTextChecks: allowedLinks parameter must be either true or false");

        const cmtResultObject = checkMarkdownText(fieldName, fieldText, rowLocation, optionalCheckingOptions);

        // Choose only ONE of the following
        // This is the fast way of append the results from this field
        // result.noticeList = result.noticeList.concat(cmtResultObject.noticeList);
        // If we need to put everything through addNotice6to9, e.g., for debugging or filtering
        //  process results line by line
        for (const noticeEntry of cmtResultObject.noticeList) {
            // console.assert(Object.keys(noticeEntry).length === 5, `TL ourMarkdownTextChecks notice length=${Object.keys(noticeEntry).length}`);
            addNotice6to9({ ...noticeEntry, rowID, fieldName });
        }
    }
    // end of ourMarkdownTextChecks function

    function ourCheckTextField(rowID, fieldName, fieldText, allowedLinks, rowLocation, optionalCheckingOptions) {
        /**
        * @description - checks the given text field and processes the returned results
        * @param {String} rowID - 4-character row ID field
        * @param {String} fieldName - name of the field being checked
        * @param {String} fieldText - the actual text of the field being checked
        * @param {boolean} allowedLinks - true if links are allowed in the field, otherwise false
        * @param {String} rowLocation - description of where the line is located
        * @param {Object} optionalCheckingOptions - parameters that might affect the check
        */
        // Does basic checks for small errors like leading/trailing spaces, etc.

        // We assume that checking for compulsory fields is done elsewhere

        // Updates the global list of notices

        // console.log(`cTSVrow ourCheckTextField(${fieldName}, (${fieldText.length}), ${allowedLinks}, ${rowLocation}, …)`);
        console.assert(rowID !== undefined, "cTSVrow ourCheckTextField: 'rowID' parameter should be defined");
        console.assert(typeof rowID === 'string', `cTSVrow ourCheckTextField: 'rowID' parameter should be a string not a '${typeof rowID}'`);
        console.assert(fieldName !== undefined, "cTSVrow ourCheckTextField: 'fieldName' parameter should be defined");
        console.assert(typeof fieldName === 'string', `cTSVrow ourCheckTextField: 'fieldName' parameter should be a string not a '${typeof fieldName}'`);
        console.assert(fieldText !== undefined, "cTSVrow ourCheckTextField: 'fieldText' parameter should be defined");
        console.assert(typeof fieldText === 'string', `cTSVrow ourCheckTextField: 'fieldText' parameter should be a string not a '${typeof fieldText}'`);
        console.assert(allowedLinks === true || allowedLinks === false, "cTSVrow ourCheckTextField: allowedLinks parameter must be either true or false");

        const dbtcResultObject = checkTextField(fieldName, fieldText, allowedLinks, rowLocation, optionalCheckingOptions);

        // Choose only ONE of the following
        // This is the fast way of append the results from this field
        // result.noticeList = result.noticeList.concat(dbtcResultObject.noticeList);
        // If we need to put everything through addNotice6to9, e.g., for debugging or filtering
        //  process results line by line
        for (const noticeEntry of dbtcResultObject.noticeList) {
            // console.assert(Object.keys(noticeEntry).length === 5, `TL ourCheckTextField notice length=${Object.keys(noticeEntry).length}`);
            addNotice6to9({ ...noticeEntry, rowID, fieldName });
        }
    }
    // end of ourCheckTextField function

    async function ourCheckTAReference(rowID, fieldName, taLinkText, rowLocation, optionalCheckingOptions) {
        // Checks that the TA reference can be found

        // Updates the global list of notices

        // console.log(`cTSVrow ourCheckTAReference(${fieldName}, (${taLinkText.length}) '${taLinkText}', ${rowLocation}, …)`);
        console.assert(rowID !== undefined, "cTSVrow ourCheckTAReference: 'rowID' parameter should be defined");
        console.assert(typeof rowID === 'string', `cTSVrow ourCheckTAReference: 'rowID' parameter should be a string not a '${typeof rowID}'`);
        console.assert(fieldName !== undefined, "cTSVrow ourCheckTAReference: 'fieldName' parameter should be defined");
        console.assert(typeof fieldName === 'string', `cTSVrow ourCheckTAReference: 'fieldName' parameter should be a string not a '${typeof fieldName}'`);
        console.assert(taLinkText !== undefined, "cTSVrow ourCheckTAReference: 'taLinkText' parameter should be defined");
        console.assert(typeof taLinkText === 'string', `cTSVrow ourCheckTAReference: 'taLinkText' parameter should be a string not a '${typeof taLinkText}'`);

        const coqResultObject = await checkTAReference(fieldName, taLinkText, rowLocation, optionalCheckingOptions);

        // Choose only ONE of the following
        // This is the fast way of append the results from this field
        // result.noticeList = result.noticeList.concat(coqResultObject.noticeList);
        // If we need to put everything through addNotice6to9, e.g., for debugging or filtering
        //  process results line by line
        for (const noticeEntry of coqResultObject.noticeList) {
            // console.assert(Object.keys(noticeEntry).length === 5, `TL ourCheckTAReference notice length=${Object.keys(noticeEntry).length}`);
            addNotice6to9({ ...noticeEntry, rowID, fieldName });
        }
    }
    // end of ourCheckTAReference function

    async function ourCheckTNOriginalLanguageQuote(rowID, fieldName, fieldText, rowLocation, optionalCheckingOptions) {
        // Checks that the Hebrew/Greek quote can be found in the original texts

        // Uses the bookID,C,V values from the main function call

        // Updates the global list of notices

        // console.log(`cTSVrow ourCheckTNOriginalLanguageQuote(${fieldName}, (${fieldText.length}) '${fieldText}', ${rowLocation}, …)`);
        console.assert(rowID !== undefined, "cTSVrow ourMarkdownTextChecks: 'rowID' parameter should be defined");
        console.assert(typeof rowID === 'string', `cTSVrow ourMarkdownTextChecks: 'rowID' parameter should be a string not a '${typeof rowID}'`);
        console.assert(fieldName !== undefined, "cTSVrow ourMarkdownTextChecks: 'fieldName' parameter should be defined");
        console.assert(typeof fieldName === 'string', `cTSVrow ourMarkdownTextChecks: 'fieldName' parameter should be a string not a '${typeof fieldName}'`);
        console.assert(fieldText !== undefined, "cTSVrow ourCheckTNOriginalLanguageQuote: 'fieldText' parameter should be defined");
        console.assert(typeof fieldText === 'string', `cTSVrow ourCheckTNOriginalLanguageQuote: 'fieldText' parameter should be a string not a '${typeof fieldText}'`);

        const coqResultObject = await checkOriginalLanguageQuote(fieldName,fieldText, bookID,C,V, rowLocation, optionalCheckingOptions);

        // Choose only ONE of the following
        // This is the fast way of append the results from this field
        // result.noticeList = result.noticeList.concat(coqResultObject.noticeList);
        // If we need to put everything through addNotice6to9, e.g., for debugging or filtering
        //  process results line by line
        for (const noticeEntry of coqResultObject.noticeList) {
            // console.assert(Object.keys(noticeEntry).length === 5, `TL ourCheckTNOriginalLanguageQuote notice length=${Object.keys(noticeEntry).length}`);
            addNotice6to9({ ...noticeEntry, rowID, fieldName });
        }
    }
    // end of ourCheckTNOriginalLanguageQuote function

    async function ourCheckTNLinks(rowID, fieldName, taLinkText, rowLocation, optionalCheckingOptions) {
        // Checks that the TA reference can be found

        // Updates the global list of notices

        // console.log(`cTSVrow ourCheckTNLinks(${fieldName}, (${taLinkText.length}) '${taLinkText}', ${rowLocation}, …)`);
        console.assert(rowID !== undefined, "cTSVrow ourCheckTNLinks: 'rowID' parameter should be defined");
        console.assert(typeof rowID === 'string', `cTSVrow ourCheckTNLinks: 'rowID' parameter should be a string not a '${typeof rowID}'`);
        console.assert(fieldName !== undefined, "cTSVrow ourCheckTNLinks: 'fieldName' parameter should be defined");
        console.assert(typeof fieldName === 'string', `cTSVrow ourCheckTNLinks: 'fieldName' parameter should be a string not a '${typeof fieldName}'`);
        console.assert(taLinkText !== undefined, "cTSVrow ourCheckTNLinks: 'taLinkText' parameter should be defined");
        console.assert(typeof taLinkText === 'string', `cTSVrow ourCheckTNLinks: 'taLinkText' parameter should be a string not a '${typeof taLinkText}'`);

        const coqResultObject = await checkTNLinks(bookID, fieldName, taLinkText, rowLocation, optionalCheckingOptions);

        // Choose only ONE of the following
        // This is the fast way of append the results from this field
        // result.noticeList = result.noticeList.concat(coqResultObject.noticeList);
        // If we need to put everything through addNotice6to9, e.g., for debugging or filtering
        //  process results line by line
        for (const noticeEntry of coqResultObject.noticeList) {
            // console.assert(Object.keys(noticeEntry).length === 5, `TL ourCheckTNLinks notice length=${Object.keys(noticeEntry).length}`);
            addNotice6to9({ ...noticeEntry, rowID, fieldName });
        }
    }
    // end of ourCheckTNLinks function


    // Main code for checkTN_TSVDataRow function
    if (line === EXPECTED_TN_HEADING_LINE) // Assume it must be ok
        return drResult; // We can't detect if it's in the wrong place

    let extractLength;
    try {
        extractLength = optionalCheckingOptions.extractLength;
    } catch (tlcELerror) { }
    if (typeof extractLength !== 'number' || isNaN(extractLength)) {
        extractLength = DEFAULT_EXTRACT_LENGTH;
        // console.log(`Using default extractLength=${extractLength}`);
    }
    // else
        // console.log(`Using supplied extractLength=${extractLength}`, `cf. default=${DEFAULT_EXTRACT_LENGTH}`);
    // const halfLength = Math.floor(extractLength / 2); // rounded down
    // const halfLengthPlus = Math.floor((extractLength + 1) / 2); // rounded up
    // console.log(`Using halfLength=${halfLength}`, `halfLengthPlus=${halfLengthPlus}`);

    const lowercaseBookID = bookID.toLowerCase();
    let numChaptersThisBook;
    try {
        numChaptersThisBook = books.chaptersInBook(lowercaseBookID).length;
    } catch (tlcNCerror) {
        addNotice6to9({priority:979, message:"Invalid book identifier passed to checkTN_TSVDataRow", location:` '${bookID}' in first parameter: ${tlcNCerror}`});
    }
    const haveGoodBookID = numChaptersThisBook !== undefined;

    let fields = line.split('\t');
    if (fields.length === NUM_EXPECTED_TN_TSV_FIELDS) {
        const [B, C, V, rowID, supportReference, origQuote, occurrence, GLQuote, occurrenceNote] = fields;
        // let withString = ` with '${rowID}'${inString}`;
        // let CV_withString = ` ${C}:${V}${withString}`;
        // let atString = ` at ${B} ${C}:${V} (${rowID})${inString}`;

        // Check the fields one-by-one
        if (B.length) {
            if (B !== bookID)
                addNotice6to9({priority:978, message:`Wrong '${B}' book identifier`, rowID, location:` (expected '${bookID}')${ourRowLocation}`});
        }
        else
            addNotice6to9({priority:977, message:"Missing book identifier", characterIndex:0, rowID, location:ourRowLocation});

        let numVersesThisChapter, haveGoodChapterNumber;
        if (C.length) {
            if (C === 'front') { }
            else if (/^\d+$/.test(C)) {
                let intC = Number(C);
                if (intC === 0) {
                    addNotice6to9({priority:824, message:`Invalid zero chapter number`, extract:C, rowID, location:ourRowLocation});
                    haveGoodChapterNumber = false;
                }
                // TODO: Does this next section need rewriting (see verse check below)???
                else if (intC > numChaptersThisBook) {
                    addNotice6to9({priority:823, message:`Invalid large chapter number`, extract:C, rowID, location:ourRowLocation});
                    haveGoodChapterNumber = false;
                }
                try {
                    numVersesThisChapter = books.versesInChapter(lowercaseBookID, intC);
                    haveGoodChapterNumber = true;
                } catch (tlcNVerror) {
                    if (!haveGoodBookID)
                        // addNotice6to9({priority:500, "Invalid chapter number", rowLocation);
                        // else
                        addNotice6to9({priority:822, message:"Unable to check chapter number", rowID, location:` '${C}'${ourRowLocation}`});
                    haveGoodChapterNumber = false;
                }
            }
            else
                addNotice6to9({priority:821, message:"Bad chapter number", rowID, location:` '${C}' with${ourRowLocation}`});
        }
        else
            addNotice6to9({priority:820, message:"Missing chapter number", rowID, location:` ?:${V}${ourRowLocation}`});

        if (V.length) {
            if (V === 'intro') { }
            else if (/^\d+$/.test(V)) {
                let intV = Number(V);
                if (intV === 0)
                    addNotice6to9({priority:814, message:`Invalid zero '${V}' verse number`, rowID, location:ourRowLocation});
                else {
                    if (haveGoodChapterNumber) {
                        if (intV > numVersesThisChapter)
                            addNotice6to9({priority:813, message:`Invalid large '${V}' verse number`, rowID, location:` for chapter ${C}${ourRowLocation}`});
                    } else
                        addNotice6to9({priority:812, message:"Unable to check verse number", rowID, location:` '${V}'${ourRowLocation}`});
                }
            }
            else
                addNotice6to9({priority:811, message:"Bad verse number", rowID, location:` '${V}'${ourRowLocation}`});
        }
        else
            addNotice6to9({priority:810, message:"Missing verse number", rowID, location:` after ${C}:?${ourRowLocation}`});

        if (!rowID.length)
            addNotice6to9({priority:779, message:"Missing ID field", location:ourRowLocation});
        else {
            if (rowID.length !== 4)
                addNotice6to9({priority:778, message:"ID should be exactly 4 characters", rowID, location:` (not ${rowID.length})${ourRowLocation}`});
            else if ('abcdefghijklmnopqrstuvwxyz0123456789'.indexOf(rowID[0]) < 0)
                addNotice6to9({priority:176, message:"ID should start with a lowercase letter or digit", characterIndex:0, rowID, location:` (not '${rowID[0]}')${ourRowLocation}`});
            else if ('abcdefghijklmnopqrstuvwxyz0123456789'.indexOf(rowID[3]) < 0)
                addNotice6to9({priority:175, message:"ID should end with a lowercase letter or digit", characterIndeX:3, rowID, location:` (not '${rowID[3]}')${ourRowLocation}`});
            else if ('abcdefghijklmnopqrstuvwxyz0123456789'.indexOf(rowID[1]) < 0)
                addNotice6to9({priority:174, message:"ID characters should only be lowercase letters, digits, or hypen", characterIndex:1, rowID, location:` (not '${rowID[1]}')${ourRowLocation}`});
            else if ('abcdefghijklmnopqrstuvwxyz0123456789'.indexOf(rowID[2]) < 0)
                addNotice6to9({priority:173, message:"ID characters should only be lowercase letters, digits, or hypen", characterIndex:2, rowID, location:` (not '${rowID[2]}')${ourRowLocation}`});
        }

        if (supportReference.length) { // need to check UTN against UTA
            ourCheckTextField(rowID, 'SupportReference', supportReference, true, ourRowLocation, optionalCheckingOptions);
            await ourCheckTAReference(rowID, 'SupportReference', supportReference, ourRowLocation, optionalCheckingOptions);
        }
        // else // TODO: Find out if these fields are really compulsory (and when they're not, e.g., for 'intro') ???
        //     addNotice6to9({priority:277, message:"Missing SupportReference field", location:ourRowLocation});

        if (origQuote.length) { // need to check UTN against UHB and UGNT
            ourCheckTextField(rowID, 'OrigQuote', origQuote, false, ourRowLocation, optionalCheckingOptions);
            await ourCheckTNOriginalLanguageQuote(rowID, 'OrigQuote', origQuote, ourRowLocation, optionalCheckingOptions);
        }
        else // TODO: Find more details about when these fields are really compulsory (and when they're not, e.g., for 'intro') ???
            if (V !== 'intro' && occurrence !== '0')
                addNotice6to9({priority:919, message:"Missing OrigQuote field", rowID, location:ourRowLocation});

        if (occurrence.length) { // This should usually be a digit
            if (occurrence === '0') { // zero means that it doesn't occur
                if (origQuote.length)
                    addNotice6to9({priority:550, message:"Invalid zero occurrence field when we have an original quote", rowID, location:ourRowLocation});
                // if (V !== 'intro')
                //     addNotice6to9({priority:500, message:"Invalid zero occurrence field", rowID, location:rowLocation);
            }
            else if (occurrence === '-1') // TODO check the special conditions when this can occur???
                ;
            else if ('12345'.indexOf(occurrence) < 0) // it's not one of these integers
                addNotice6to9({priority:792, message:`Invalid '${occurrence}' occurrence field`, rowID, location:ourRowLocation});
        }

        if (GLQuote.length) { // TODO: need to check UTN against ULT
            if (V !== 'intro')
                ourCheckTextField(rowID, 'GLQuote', GLQuote, false, ourRowLocation, optionalCheckingOptions);
        }
        else // TODO: Find out if these fields are really compulsory (and when they're not, e.g., for 'intro') ???
            if (V !== 'intro')
                addNotice6to9({priority:275, message:"Missing GLQuote field", rowID, location:ourRowLocation});

        if (occurrenceNote.length) {
            ourMarkdownTextChecks(rowID, 'OccurrenceNote', occurrenceNote, true, ourRowLocation, optionalCheckingOptions);
            await ourCheckTNLinks(rowID, 'OccurrenceNote', occurrenceNote, ourRowLocation, optionalCheckingOptions);
        }
        else // TODO: Find out if these fields are really compulsory (and when they're not, e.g., for 'intro') ???
            addNotice6to9({priority:274, message:"Missing OccurrenceNote field", rowID, location:ourRowLocation});

    } else
        addNotice6to9({priority:861, message:`Found wrong number of TSV fields (expected ${NUM_EXPECTED_TN_TSV_FIELDS})`, extract:`Found ${fields.length} field${fields.length === 1 ? '' : 's'}`, location:ourRowLocation});

        // console.log(`  checkTN_TSVDataRow returning with ${drResult.noticeList.length.toLocaleString()} notice(s).`);
        // console.log("checkTN_TSVDataRow result is", JSON.stringify(drResult));
        return drResult; // object with noticeList only
}
// end of checkTN_TSVDataRow function

export default checkTN_TSVDataRow;
