import React from 'react';
import * as books from '../../core/books/books';
import checkFile from '../file-check/checkFile';
import checkRepo from '../repo-check/checkRepo';
import { getFilelistFromZip, getFile } from '../../core/getApi';
// import { consoleLogObject } from '../../core/utilities';


const CHECKER_VERSION_STRING = '0.2.1';


async function checkTQbook(username, repoName, branch, bookCode, checkingOptions) {
    // console.log(`checkTQbook(${username}, ${repoName}, ${branch}, ${bookCode}, …)…`);

    const repoCode = 'TQ';
    const generalLocation = `in ${username} ${repoName} (${branch})`;

    const ctqResult = { successList: [], noticeList: [] };

    function addSuccessMessage(successString) {
        // console.log(`checkBookPackage success: ${successString}`);
        ctqResult.successList.push(successString);
    }

    function addNotice9(priority, BBB, C, V, message, index, extract, location, extra) {
        // console.log(`checkTQbook addNotice9: (priority=${priority}) ${message}${index > 0 ? ` (at character ${index}${1})` : ""}${extract ? ` ${extract}` : ""}${location}`);
        console.assert(priority !== undefined, "cTQ addNotice9: 'priority' parameter should be defined");
        console.assert(typeof priority === 'number', `cTQ addNotice9: 'priority' parameter should be a number not a '${typeof priority}'`);
        console.assert(BBB !== undefined, "cTQ addNotice9: 'BBB' parameter should be defined");
        console.assert(typeof BBB === 'string', "cTQ addNotice9: 'BBB' parameter should be a string not a '" + (typeof BBB) + "'");
        console.assert(BBB.length === 3, `cTQ addNotice9: 'BBB' parameter should be three characters long not ${BBB.length}`);
        console.assert(C !== undefined, "cTQ addNotice9: 'C' parameter should be defined");
        console.assert(typeof C === 'string', "cTQ addNotice9: 'C' parameter should be a string not a '" + (typeof C) + "'");
        console.assert(V !== undefined, "cTQ addNotice9: 'V' parameter should be defined");
        console.assert(typeof V === 'string', "cTQ addNotice9: 'V' parameter should be a string not a '" + (typeof V) + "'");
        console.assert(message !== undefined, "cTQ addNotice9: 'message' parameter should be defined");
        console.assert(typeof message === 'string', `cTQ addNotice9: 'message' parameter should be a string not a '${typeof message}'`);
        console.assert(index !== undefined, "cTQ addNotice9: 'index' parameter should be defined");
        console.assert(typeof index === 'number', `cTQ addNotice9: 'index' parameter should be a number not a '${typeof index}'`);
        console.assert(extract !== undefined, "cTQ addNotice9: 'extract' parameter should be defined");
        console.assert(typeof extract === 'string', `cTQ addNotice9: 'extract' parameter should be a string not a '${typeof extract}'`);
        console.assert(location !== undefined, "cTQ addNotice9: 'location' parameter should be defined");
        console.assert(typeof location === 'string', `cTQ addNotice9: 'location' parameter should be a string not a '${typeof location}'`);
        console.assert(extra !== undefined, "cTQ addNotice9: 'extra' parameter should be defined");
        console.assert(typeof extra === 'string', `cTQ addNotice9: 'extra' parameter should be a string not a '${typeof extra}'`);
        ctqResult.noticeList.push([priority, BBB, C, V, message, index, extract, location, extra]);
    }


    async function doOurCheckFile(repoCode, filename, file_content, fileLocation, optionalCheckingOptions) {
        // console.log(`checkBookPackage doOurCheckFile(${filename})`);

        // Updates the global list of notices
        console.assert(repoCode !== undefined, "cTQ doOurCheckFile: 'repoCode' parameter should be defined");
        console.assert(typeof repoCode === 'string', `cTQ doOurCheckFile: 'repoCode' parameter should be a string not a '${typeof repoCode}'`);
        console.assert(filename !== undefined, "cTQ doOurCheckFile: 'filename' parameter should be defined");
        console.assert(typeof filename === 'string', `cTQ doOurCheckFile: 'filename' parameter should be a string not a '${typeof filename}'`);
        console.assert(file_content !== undefined, "cTQ doOurCheckFile: 'file_content' parameter should be defined");
        console.assert(typeof file_content === 'string', `cTQ doOurCheckFile: 'file_content' parameter should be a string not a '${typeof file_content}'`);
        console.assert(fileLocation !== undefined, "cTQ doOurCheckFile: 'fileLocation' parameter should be defined");
        console.assert(typeof fileLocation === 'string', `cTQ doOurCheckFile: 'fileLocation' parameter should be a string not a '${typeof fileLocation}'`);

        const cfResultObject = await checkFile(filename, file_content, fileLocation, optionalCheckingOptions);
        // console.log("checkFile() returned", cfResultObject.successList.length, "success message(s) and", cfResultObject.noticeList.length, "notice(s)");
        // for (const successEntry of cfResultObject.successList) console.log("  doOurCheckFile:", successEntry);

        // Process results line by line,  appending the repoCode as an extra field as we go
        for (const noticeEntry of cfResultObject.noticeList) {
            // noticeEntry is an array of eight fields: 1=priority, 2=BBB, 3=C, 4=V, 5=msg, 6=index, 7=extract, 8=location
            console.assert(noticeEntry.length === 5, `cTQ doOurCheckFile notice length=${noticeEntry.length}`);
            // We add the repoCode as an extra value
            addNotice9(noticeEntry[0], '', '', '', noticeEntry[1], noticeEntry[2], noticeEntry[3], noticeEntry[4], repoCode);
        }
    }
    // end of doOurCheckFile function


    // Main code for checkTQbook
    // We need to find an check all the markdown folders/files for this book
    let checkedFileCount = 0, checkedFilenames = [], checkedFilenameExtensions = new Set(['md']), totalCheckedSize = 0;
    const pathList = await getFilelistFromZip({ username, repository: repoName, branch, optionalPrefix: `${bookCode.toLowerCase()}/` });
    for (const thisPath of pathList) {
        // console.log("checkTQbook: Try to load", username, repoName, thisPath, branch);
        let tqFileContent;
        try {
            tqFileContent = await getFile({ username, repository: repoName, path: thisPath, branch });
            // console.log("Fetched file_content for", repoName, thisPath, typeof tqFileContent, tqFileContent.length);
            checkedFilenames.push(thisPath);
            totalCheckedSize += tqFileContent.length;
        } catch (e) {
            console.log("Failed to load", username, repoName, thisPath, branch, e + '');
            addNotice9(996, bookCode, "", "", "Failed to load", -1, "", `${generalLocation} ${thisPath}: ${e}`, repoCode);
            continue;
        }

        // We use the generalLocation here (does not include repo name)
        //  so that we can adjust the returned strings ourselves
        await doOurCheckFile(repoCode, thisPath, tqFileContent, generalLocation, checkingOptions); // Adds the notices to checkBookPackageResult
        checkedFileCount += 1;
        // addSuccessMessage(`Checked ${repoCode.toUpperCase()} file: ${thisPath}`);
    }
    addSuccessMessage(`Checked ${checkedFileCount.toLocaleString()} ${repoCode.toUpperCase()} file${checkedFileCount === 1 ? '' : 's'}`);

    ctqResult.checkedFileCount = checkedFileCount;
    ctqResult.checkedFilenames = checkedFilenames;
    ctqResult.checkedFilenameExtensions = [...checkedFilenameExtensions]; // convert Set to Array
    ctqResult.checkedFilesizes = totalCheckedSize;
    return ctqResult;
}
// end of checkTQbook function


async function checkBookPackage(username, language_code, bookCode, setResultValue, checkingOptions) {
    /*
    Note that bookCode here can also be the 'OBS' pseudo bookCode.
    */
    //     console.log(`I'm here in checkBookPackage v${CHECKER_VERSION_STRING}
    //   with ${username}, ${language_code}, ${bookCode}, ${JSON.stringify(checkingOptions)}`);
    const startTime = new Date();

    const checkBookPackageResult = { successList: [], noticeList: [] };

    function addSuccessMessage(successString) {
        // console.log(`checkBookPackage success: ${successString}`);
        checkBookPackageResult.successList.push(successString);
    }

    function addNotice9(priority, BBB, C, V, message, index, extract, location, extra) {
        // console.log(`checkBookPackage addNotice9: (priority=${priority}) ${BBB} ${C}:${V} ${message}${index > 0 ? ` (at character ${index}${1})` : ""}${extract ? ` ${extract}` : ""}${location}`);
        console.assert(priority !== undefined, "cBP addNotice9: 'priority' parameter should be defined");
        console.assert(typeof priority === 'number', `cBP addNotice9: 'priority' parameter should be a number not a '${typeof priority}'`);
        console.assert(BBB !== undefined, "cBP addNotice9: 'BBB' parameter should be defined");
        console.assert(typeof BBB === 'string', "cBP addNotice9: 'BBB' parameter should be a string not a '" + (typeof BBB) + "'");
        console.assert(BBB.length === 3, `cBP addNotice9: 'BBB' parameter should be three characters long not ${BBB.length}`);
        console.assert(C !== undefined, "cBP addNotice9: 'C' parameter should be defined");
        console.assert(typeof C === 'string', "cBP addNotice9: 'C' parameter should be a string not a '" + (typeof C) + "'");
        console.assert(V !== undefined, "cBP addNotice9: 'V' parameter should be defined");
        console.assert(typeof V === 'string', "cBP addNotice9: 'V' parameter should be a string not a '" + (typeof V) + "'");
        console.assert(message !== undefined, "cBP addNotice9: 'message' parameter should be defined");
        console.assert(typeof message === 'string', `cBP addNotice9: 'message' parameter should be a string not a '${typeof message}'`);
        console.assert(index !== undefined, "cBP addNotice9: 'index' parameter should be defined");
        console.assert(typeof index === 'number', `cBP addNotice9: 'index' parameter should be a number not a '${typeof index}'`);
        console.assert(extract !== undefined, "cBP addNotice9: 'extract' parameter should be defined");
        console.assert(typeof extract === 'string', `cBP addNotice9: 'extract' parameter should be a string not a '${typeof extract}'`);
        console.assert(location !== undefined, "cBP addNotice9: 'location' parameter should be defined");
        console.assert(typeof location === 'string', `cBP addNotice9: 'location' parameter should be a string not a '${typeof location}'`);
        console.assert(extra !== undefined, "cBP addNotice9: 'extra' parameter should be defined");
        console.assert(typeof extra === 'string', `cBP addNotice9: 'extra' parameter should be a string not a '${typeof extra}'`);
        checkBookPackageResult.noticeList.push([priority, BBB, C, V, message, index, extract, location, extra]);
    }


    async function doOurCheckFile(repoCode, filename, file_content, fileLocation, optionalCheckingOptions) {
        // console.log(`checkBookPackage doOurCheckFile(${filename})`);

        // Updates the global list of notices
        console.assert(repoCode !== undefined, "cBP doOurCheckFile: 'repoCode' parameter should be defined");
        console.assert(typeof repoCode === 'string', `cBP doOurCheckFile: 'repoCode' parameter should be a string not a '${typeof repoCode}'`);
        console.assert(filename !== undefined, "cBP doOurCheckFile: 'filename' parameter should be defined");
        console.assert(typeof filename === 'string', `cBP doOurCheckFile: 'filename' parameter should be a string not a '${typeof filename}'`);
        console.assert(file_content !== undefined, "cBP doOurCheckFile: 'file_content' parameter should be defined");
        console.assert(typeof file_content === 'string', `cBP doOurCheckFile: 'file_content' parameter should be a string not a '${typeof file_content}'`);
        console.assert(fileLocation !== undefined, "cBP doOurCheckFile: 'fileLocation' parameter should be defined");
        console.assert(typeof fileLocation === 'string', `cBP doOurCheckFile: 'fileLocation' parameter should be a string not a '${typeof fileLocation}'`);

        const cfResultObject = await checkFile(filename, file_content, fileLocation, optionalCheckingOptions);
        // console.log("checkFile() returned", cfResultObject.successList.length, "success message(s) and", cfResultObject.noticeList.length, "notice(s)");
        // for (const successEntry of cfResultObject.successList) console.log("  doOurCheckFile:", successEntry);

        // Process results line by line,  appending the repoCode as an extra field as we go
        for (const noticeEntry of cfResultObject.noticeList) {
            // noticeEntry is an array of eight fields: 1=priority, 2=BBB, 3=C, 4=V, 5=msg, 6=index, 7=extract, 8=location
            // We add the repoCode as an extra value
            if (noticeEntry.length === 8)
                addNotice9(noticeEntry[0], noticeEntry[1], noticeEntry[2], noticeEntry[3], noticeEntry[4], noticeEntry[5], noticeEntry[6], noticeEntry[7], repoCode);
            else if (noticeEntry.length === 5)
                addNotice9(noticeEntry[0], bookCode,'','', noticeEntry[1], noticeEntry[2], noticeEntry[3], noticeEntry[4], repoCode);
            else
                console.assert(noticeEntry.length === 8, `cBP doOurCheckFile notice length=${noticeEntry.length}`);
        }
    }
    // end of doOurCheckFile function


    /* async function doOurCheckRepo(username, repoName, branch, repoLocation, optionalCheckingOptions) {
        // console.log(`checkBookPackage doOurCheckRepo(${username}, ${repoName}, ${branch})…`);

        // Updates the global list of notices
        console.assert(username !== undefined, "cBP doOurCheckRepo: 'username' parameter should be defined");
        console.assert(typeof username === 'string', `cBP doOurCheckRepo: 'username' parameter should be a string not a '${typeof username}'`);
        console.assert(repoName !== undefined, "cBP doOurCheckRepo: 'repoName' parameter should be defined");
        console.assert(typeof repoName === 'string', `cBP doOurCheckRepo: 'repoName' parameter should be a string not a '${typeof repoName}'`);
        console.assert(repoLocation !== undefined, "cBP doOurCheckRepo: 'repoLocation' parameter should be defined");
        console.assert(typeof repoLocation === 'string', `cBP doOurCheckRepo: 'repoLocation' parameter should be a string not a '${typeof repoLocation}'`);

        const crResultObject = await checkRepo(username, repoName, branch, repoLocation, setResultValue, optionalCheckingOptions)
        console.log(`checkRepo() returned ${crResultObject.successList.length} success message(s) and ${crResultObject.noticeList.length} notice(s)`);
        console.log("crResultObject keys", JSON.stringify(Object.keys(crResultObject)));

        // Concat is faster if we don't need to process each notice individually
        checkBookPackageResult.successList = checkBookPackageResult.successList.concat(crResultObject.successList);
        checkBookPackageResult.noticeList = checkBookPackageResult.noticeList.concat(crResultObject.noticeList);
        // Process results line by line
        // for (const noticeEntry of crResultObject.noticeList)
        // noticeEntry is an array of eight fields: 1=priority, 2=BBB, 3=C, 4=V, 5=msg, 6=index, 7=extract, 8=location
        // We add the repoCode as an extra value
        // addNotice9(noticeEntry[0], noticeEntry[1], noticeEntry[2], noticeEntry[3], noticeEntry[4], noticeEntry[5], noticeEntry[6], noticeEntry[7]);
        // console.log(`doOurCheckRepo() finished.`)
        return crResultObject;
    }
    // end of doOurCheckRepo function */


    // Main code for checkBookPackage()
    const generalLocation = ` ${language_code} ${bookCode} book package from ${username}`;

    // No point in passing the branch through as a parameter
    //  coz if it's not 'master', it's unlikely to be common for all the repos
    const branch = 'master'

    if (bookCode === 'OBS') {
        // We use the generalLocation here (does not include repo name)
        //  so that we can adjust the returned strings ourselves
        // console.log("Calling OBS checkRepo()…");
        checkBookPackageResult = await checkRepo(username, `${language_code}_obs`, branch, generalLocation, setResultValue, checkingOptions); // Adds the notices to checkBookPackageResult
        // console.log(`checkRepo() returned ${checkBookPackageResult.successList.length} success message(s) and ${checkBookPackageResult.noticeList.length} notice(s)`);
        // console.log("crResultObject keys", JSON.stringify(Object.keys(checkBookPackageResult)));

        // Concat is faster if we don't need to process each notice individually
        // checkBookPackageResult.successList = checkBookPackageResult.successList.concat(crResultObject.successList);
        // checkBookPackageResult.noticeList = checkBookPackageResult.noticeList.concat(crResultObject.noticeList);
        // checkedFileCount += crResultObject.fileCount;
        addSuccessMessage(`Checked ${language_code} OBS repo from ${username}`);
    } else {
        // We also need to know the number for USFM books
        let bookNumberAndName, whichTestament;
        try {
            bookNumberAndName = books.usfmNumberName(bookCode);
            whichTestament = books.testament(bookCode); // returns 'old' or 'new'
        } catch (e) {
            addNotice9(900, '', '', '', "Bad function call: should be given a valid book abbreviation", -1, bookCode, ` (not '${bookCode}')${location}`, '');
            return checkBookPackageResult;
        }
        // console.log(`bookNumberAndName='${bookNumberAndName}' (${whichTestament} testament)`);

        // So now we want to work through checking this one specified Bible book in various repos:
        //  UHB/UGNT, ULT, UST, TN, TQ
        let checkedFileCount = 0, checkedFilenames = [], checkedFilenameExtensions = new Set(), totalCheckedSize = 0, checkedRepoNames = [];
        for (const repoCode of [(whichTestament === 'old' ? 'UHB' : 'UGNT'), 'ULT', 'UST', 'TN', 'TQ']) {
            // console.log(`Let's try ${repoCode} (${language_code} ${bookCode} from ${username})`);
            const repoLocation = ` in ${repoCode.toUpperCase()}${generalLocation}`;

            let repo_language_code = language_code;
            if (repoCode === 'UHB') repo_language_code = 'hbo';
            else if (repoCode === 'UGNT') repo_language_code = 'el-x-koine';
            const repoName = `${repo_language_code}_${repoCode.toLowerCase()}`;

            const fullRepoName = username + '/' + repoName;
            // console.log("Let's try1", bookCode, "from", fullRepoName);

            let filename;
            if (repoCode === 'UHB' || repoCode === 'UGNT' || repoCode === 'ULT' || repoCode === 'UST') {
                filename = `${bookNumberAndName}.usfm`;
                checkedFilenameExtensions.add('usfm');
            }
            else if (repoCode === 'TN') {
                filename = `${language_code}_tn_${bookNumberAndName}.tsv`;
                checkedFilenameExtensions.add('tsv');
            }
            /*
            else if (repoCode === 'TQ') {
                // How are we going to handle all these folders of .md files ???
                // This resource will eventually be converted to TSV tables
                filename = bookCode.toLowerCase() + '/01/01.md';
                checkedFilenameExtensions.add('md');
            } */

            if (repoCode === 'TQ') {
                // This resource might eventually be converted to TSV tables
                const tqResultObject = await checkTQbook(username, repoName, branch, bookCode, checkingOptions);
                checkBookPackageResult.successList = checkBookPackageResult.successList.concat(tqResultObject.successList);
                checkBookPackageResult.noticeList = checkBookPackageResult.noticeList.concat(tqResultObject.noticeList);
                checkedFilenames = checkedFilenames.concat(tqResultObject.checkedFilenames);
                checkedFilenameExtensions = new Set([...checkedFilenameExtensions, ...tqResultObject.checkedFilenameExtensions]);
                checkedFileCount += tqResultObject.checkedFileCount;
                totalCheckedSize += tqResultObject.totalCheckedSize;
                checkedRepoNames.push(repoCode);
            } else { // For repos other than TQ, we only have one file to check
                // console.log("Try to load", username, repoName, filename, branch);
                let repoFileContent;
                try {
                    repoFileContent = await getFile({ username, repository: repoName, path: filename, branch });
                    // console.log("Fetched file_content for", repoName, filename, typeof repoFileContent, repoFileContent.length);
                    checkedFilenames.push(filename);
                    totalCheckedSize += repoFileContent.length;
                    checkedRepoNames.push(repoCode);
                } catch (e) {
                    console.log("ERROR: Failed to load", username, repoName, filename, branch, e + '');
                    addNotice9(996, bookCode, '', '', "Failed to load", -1, "", `${generalLocation} ${filename}: ${e}`, repoCode);
                    continue;
                }

                // We use the generalLocation here (does not include repo name)
                //  so that we can adjust the returned strings ourselves
                await doOurCheckFile(repoCode, filename, repoFileContent, generalLocation, checkingOptions); // Adds the notices to checkBookPackageResult
                checkedFileCount += 1;
                addSuccessMessage(`Checked ${repoCode.toUpperCase()} file: ${filename}`);
            }

            // Update our "waiting" message
            setResultValue(<p style={{ color: 'magenta' }}>Waiting for check results for {username} {language_code} <b>{bookCode}</b> book package: checked <b>{checkedRepoNames.length.toLocaleString()}</b>/5 repos…</p>);
        }

        // Add some extra fields to our checkFileResult object
        //  in case we need this information again later
        checkBookPackageResult.checkedFileCount = checkedFileCount;
        checkBookPackageResult.checkedFilenames = checkedFilenames;
        checkBookPackageResult.checkedFilenameExtensions = [...checkedFilenameExtensions]; // convert Set to Array
        checkBookPackageResult.checkedFilesizes = totalCheckedSize;
        checkBookPackageResult.checkedRepoNames = checkedRepoNames;
        // checkBookPackageResult.checkedOptions = checkingOptions; // This is done at the caller level
    }

    // console.log("checkBookPackage() is returning", checkBookPackageResult.successList.length.toLocaleString(), "success message(s) and", checkBookPackageResult.noticeList.length.toLocaleString(), "notice(s)");
    checkBookPackageResult.elapsedTime = (new Date() - startTime) / 1000; // seconds
    return checkBookPackageResult;
};
// end of checkBookPackage()

export default checkBookPackage;
