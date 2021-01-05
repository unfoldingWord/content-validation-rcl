import * as books from '../../core/books/books';
import { formRepoName, checkUSFMText, checkMarkdownFileContents, checkPlainText, checkYAMLText, checkManifestText, checkTN_TSVText, checkAnnotationRows } from '../../core';


// const CHECK_FILE_CONTENTS_VERSION_STRING = '0.3.1';


/**
 *
 * @param {string} username for Door43.org
 * @param {string} languageCode, e.g., 'en'
 * @param {string} repoCode, e.g., 'TN'
 * @param {string} branch, e.g., 'master'
 * @param {string} filename
 * @param {string} fileContent
 * @param {string} givenLocation
 * @param {Object} checkingOptions
 */
export async function checkFileContents(username, languageCode, repoCode, branch, filename, fileContent, givenLocation, checkingOptions) {
  // Determine the file type from the filename extension
  //  and return the results of checking that kind of file text
  // console.log(`checkFileContents(${username}, ${languageCode}, ${filename}, ${fileContent.length} chars, ${givenLocation}, ${JSON.stringify(checkingOptions)})…`);
  console.assert(username !== undefined, "checkFileContents: 'username' parameter should be defined");
  console.assert(typeof username === 'string', `checkFileContents: 'username' parameter should be a string not a '${typeof username}': ${username}`);
  console.assert(languageCode !== undefined, "checkFileContents: 'languageCode' parameter should be defined");
  console.assert(typeof languageCode === 'string', `checkFileContents: 'languageCode' parameter should be a string not a '${typeof languageCode}': ${languageCode}`);
  console.assert(repoCode !== undefined, "checkFileContents: 'repoCode' parameter should be defined");
  console.assert(typeof repoCode === 'string', `checkFileContents: 'repoCode' parameter should be a string not a '${typeof repoCode}': ${repoCode}`);
  console.assert(branch !== undefined, "checkFileContents: 'branch' parameter should be defined");
  console.assert(typeof branch === 'string', `checkFileContents: 'branch' parameter should be a string not a '${typeof branch}': ${branch}`);
  console.assert(filename !== undefined, "checkFileContents: 'filename' parameter should be defined");
  console.assert(typeof filename === 'string', `checkFileContents: 'filename' parameter should be a string not a '${typeof filename}': ${filename}`);
  console.assert(fileContent !== undefined, "checkFileContents: 'fileContent' parameter should be defined");
  console.assert(typeof fileContent === 'string', `checkFileContents: 'fileContent' parameter should be a string not a '${typeof fileContent}': ${fileContent.length}`);
  console.assert(givenLocation !== undefined, "checkFileContents: 'givenLocation' parameter should be defined");
  console.assert(typeof givenLocation === 'string', `checkFileContents: 'givenLocation' parameter should be a string not a '${typeof givenLocation}': ${givenLocation}`);
  console.assert(checkingOptions !== undefined, "checkFileContents: 'checkingOptions' parameter should be defined");

  const startTime = new Date();

  let ourCFLocation = givenLocation;
  if (ourCFLocation[0] !== ' ') ourCFLocation = ' ' + ourCFLocation;

  const filenameLower = filename.toLowerCase();

  let checkFileResult = { checkedFileCount: 0 };
  if (filenameLower.endsWith('.tsv')) {
    const filenameMain = filename.substring(0, filename.length - 4); // drop .tsv
    // console.log(`checkFileContents have TSV filenameMain=${filenameMain}`);
    const bookID = filenameMain.startsWith(`${languageCode}_`) || filenameMain.startsWith('en_') ? filenameMain.substring(filenameMain.length - 3) : filenameMain.substring(0, 3).toUpperCase();
    // console.log(`checkFileContents have TSV bookID=${bookID}`);
    console.assert(bookID === 'OBS' || books.isValidBookID(bookID), `checkFileContents: '${bookID}' is not a valid USFM book identifier`);
    if (filename.startsWith(`${languageCode}_`) || filenameMain.startsWith('en_'))
      checkFileResult = await checkTN_TSVText(languageCode, bookID, filename, fileContent, ourCFLocation, checkingOptions);
    else {
      const annotationType = filenameMain.substring(4).toUpperCase();
      checkFileResult = await checkAnnotationRows(languageCode, annotationType, bookID, filename, fileContent, ourCFLocation, checkingOptions);
    }
  }
  else if (filenameLower.endsWith('.usfm')) {
    const filenameMain = filename.substring(0, filename.length - 5); // drop .usfm
    // console.log(`Have USFM filenameMain=${filenameMain}`);
    const bookID = filenameMain.substring(filenameMain.length - 3);
    // console.log(`Have USFM bookcode=${bookID}`);
    console.assert(books.isValidBookID(bookID), `checkFileContents: '${bookID}' is not a valid USFM book identifier`);
    checkFileResult = checkUSFMText(languageCode, repoCode, bookID, filename, fileContent, ourCFLocation, checkingOptions);
  } else if (filenameLower.endsWith('.sfm')) {
    const filenameMain = filename.substring(0, filename.length - 4); // drop .sfm
    console.log(`checkFileContents have SFM filenameMain=${filenameMain}`);
    const bookID = filenameMain.substring(2, 5);
    console.log(`checkFileContents have SFM bookcode=${bookID}`);
    console.assert(books.isValidBookID(bookID), `checkFileContents: '${bookID}' is not a valid USFM book identifier`);
    checkFileResult = checkUSFMText(languageCode, repoCode, bookID, filename, fileContent, ourCFLocation, checkingOptions);
  } else if (filenameLower.endsWith('.md'))
    checkFileResult = checkMarkdownFileContents(languageCode, filename, fileContent, ourCFLocation, checkingOptions);
  else if (filenameLower.endsWith('.txt'))
    checkFileResult = checkPlainText('text', filename, fileContent, ourCFLocation, checkingOptions);
  else if (filenameLower === 'manifest.yaml')
    checkFileResult = await checkManifestText(username, formRepoName(languageCode, repoCode), branch, fileContent, ourCFLocation, checkingOptions); // don’t know username or branch
  else if (filenameLower.endsWith('.yaml'))
    checkFileResult = checkYAMLText(languageCode, filename, fileContent, ourCFLocation, checkingOptions);
  else {
    checkFileResult = checkPlainText('raw', filename, fileContent, ourCFLocation, checkingOptions);
    checkFileResult.noticeList.unshift({ priority: 995, message: "File extension is not recognized, so treated as plain text.", filename, location: filename });
  }
  // console.log(`checkFileContents got initial results with ${checkFileResult.successList.length} success message(s) and ${checkFileResult.noticeList.length} notice(s)`);

  // Make sure that we have the filename in all of our notices (in case other files are being checked as well)
  function addFilenameField(noticeObject) {
    if (noticeObject.debugChain) noticeObject.debugChain = `checkFileContents ${noticeObject.debugChain}`;
    if (noticeObject.fieldName === filename) delete noticeObject.fieldName;
    return noticeObject.extra ? noticeObject : { ...noticeObject, filename }; // Might be an indirect check on a TA or TW article
  }
  checkFileResult.noticeList = checkFileResult.noticeList.map(addFilenameField);

  // Add some extra fields to our checkFileResult object
  //  in case we need this information again later
  checkFileResult.checkedFileCount += 1;
  checkFileResult.checkedFilename = filename;
  checkFileResult.checkedFilesize = fileContent.length;
  checkFileResult.checkedOptions = checkingOptions;

  checkFileResult.elapsedSeconds = (new Date() - startTime) / 1000; // seconds
  // console.log(`checkFileContents() returning ${JSON.stringify(checkFileResult)}`);
  return checkFileResult;
};
// end of checkFileContents()
