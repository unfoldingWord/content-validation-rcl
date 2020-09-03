import React, { useContext, useEffect, useState } from 'react';
// import PropTypes from 'prop-types';
// import ReactJson from 'react-json-view';
// import { Paper, Button } from '@material-ui/core';
// import { RepositoryContext, FileContext } from 'gitea-react-toolkit';
import { withStyles } from '@material-ui/core/styles';
import { getFile } from '../../core/getApi';
import checkFile from './checkFile';
import { processNoticesToErrorsWarnings, processNoticesToSevereMediumLow, processNoticesToSingleList } from '../../core/notice-processing-functions';
import { RenderSuccessesErrorsWarnings, RenderSuccessesSevereMediumLow, RenderSuccessesWarningsGradient, RenderElapsedTime } from '../RenderProcessedResults';
import { ourParseInt, consoleLogObject } from '../../core/utilities';


const FILE_CHECK_VERSION_STRING = '0.1.2';


function FileCheck(props) {

    // console.log(`I'm here in FileCheck v${FILE_CHECK_VERSION_STRING}`);
    // consoleLogObject("props", props);

    const username = props.username;
    // console.log(`FileCheck username='${username}'`);
    const repoName = props.repoName;
    // console.log(`FileCheck repoName='${repoName}'`);
    let branch = props.branch;
    // console.log(`FileCheck branch='${branch}'`);
    if (branch === undefined) branch = 'master';
    const filename = props.filename;
    // console.log(`filename='${filename}'`);

    let givenLocation = props['location'] ? props['location'] : "";
    if (givenLocation && givenLocation[0] !== " ") givenLocation = ` ${givenLocation}`;
    givenLocation = ` in ${repoName} repo${givenLocation}`;

    const checkingOptions = { // Uncomment any of these to test them
        // 'extractLength': 25,
    };
    // Or this allows the parameters to be specified as a FileCheck property
    if (props.extractLength) checkingOptions.extractLength = ourParseInt(props.extractLength);

    const [result, setResultValue] = useState("Waiting-FileCheck");
    useEffect(() => {
        // Use an IIFE (Immediately Invoked Function Expression)
        //  e.g., see https://medium.com/javascript-in-plain-english/https-medium-com-javascript-in-plain-english-stop-feeling-iffy-about-using-an-iife-7b0292aba174
        (async () => {
            // console.log("Started FileCheck.unnamedFunction()");

            // Display our "waiting" message
            setResultValue(<p style={{ color: 'magenta' }}>Waiting for check results for <b>{filename}</b>…</p>);
            // console.log(`About to call getFile(${username}, ${repoName}, ${filename}, ${branch})…`);
            const fileContent = await getFile({ username: username, repository: repoName, path: filename, branch: branch });
            const rawCFResults = await checkFile(filename, fileContent, givenLocation, checkingOptions);
            // console.log(`FileCheck got initial results with ${rawCFResults.successList.length} success message(s) and ${rawCFResults.noticeList.length} notice(s)`);

            // Add some extra fields to our rawCFResults object in case we need this information again later
            rawCFResults.checkType = 'File';
            rawCFResults.username = username;
            rawCFResults.repoName = repoName;
            rawCFResults.branch = props.branch;
            rawCFResults.filename = filename;
            rawCFResults.checkingOptions = checkingOptions;

            // Now do our final handling of the result
            let processOptions = { // Uncomment any of these to test them
                // 'maximumSimilarMessages': 3, // default is 2
                // 'errorPriorityLevel': 800, // default is 700
                // 'cutoffPriorityLevel': 100, // default is 0
                // 'sortBy': 'ByPriority', // default is 'AsFound'
                // 'ignorePriorityNumberList': [123, 202], // default is []
            };
            // Or this allows the parameters to be specified as a FileCheck property
            if (props.maximumSimilarMessages) processOptions.maximumSimilarMessages = ourParseInt(props.maximumSimilarMessages);
            if (props.errorPriorityLevel) processOptions.errorPriorityLevel = ourParseInt(props.errorPriorityLevel);
            if (props.cutoffPriorityLevel) processOptions.cutoffPriorityLevel = ourParseInt(props.cutoffPriorityLevel);
            if (props.sortBy) processOptions.sortBy = props.sortBy;
            // if (props.ignorePriorityNumberList) processOptions.ignorePriorityNumberList = props.ignorePriorityNumberList;

            let displayType = 'ErrorsWarnings'; // default
            if (props.displayType) displayType = props.displayType;

            function renderSummary(processedResults) {
                return (<>
                    <p>Checked <b>{filename}</b> (from {username} {repoName} <i>{branch === undefined ? 'DEFAULT' : branch}</i> branch)</p>
                    <p>&nbsp;&nbsp;&nbsp;&nbsp;Finished in <RenderElapsedTime elapsedTime={processedResults.elapsedTime} />.</p>
                </>);
            }

            if (displayType === 'ErrorsWarnings') {
                const processedResults = processNoticesToErrorsWarnings(rawCFResults, processOptions);
//                 console.log(`${`FileCheck got processed results with ${processedResults.successList.length.toLocaleString()} success message(s), ${processedResults.errorList.length.toLocaleString()} error(s) and ${processedResults.warningList.length.toLocaleString()} warning(s)`}
//   numIgnoredNotices=${processedResults.numIgnoredNotices.toLocaleString()} numSuppressedErrors=${processedResults.numSuppressedErrors.toLocaleString()} numSuppressedWarnings=${processedResults.numSuppressedWarnings.toLocaleString()}`);

                if (processedResults.errorList.length || processedResults.warningList.length)
                    setResultValue(<>
                        <div>{renderSummary(processedResults)}
                            {processedResults.numIgnoredNotices ? ` (but ${processedResults.numIgnoredNotices.toLocaleString()} ignored errors/warnings)` : ""}</div>
                        <RenderSuccessesErrorsWarnings results={processedResults} />
                    </>);
                else // no errors or warnings
                    setResultValue(<>
                        <div>{renderSummary(processedResults)}
                            {processedResults.numIgnoredNotices ? ` (with a total of ${processedResults.numIgnoredNotices.toLocaleString()} notices ignored)` : ""}</div>
                        <RenderSuccessesErrorsWarnings results={processedResults} />
                    </>);
            } else if (displayType === 'SevereMediumLow') {
                const processedResults = processNoticesToSevereMediumLow(rawCFResults, processOptions);
//                 console.log(`FileCheck got processed results with ${processedResults.successList.length.toLocaleString()} success message(s), ${processedResults.errorList.length.toLocaleString()} error(s) and ${processedResults.warningList.length.toLocaleString()} warning(s)
//   numIgnoredNotices=${processedResults.numIgnoredNotices.toLocaleString()} numSuppressedErrors=${processedResults.numSuppressedErrors.toLocaleString()} numSuppressedWarnings=${processedResults.numSuppressedWarnings.toLocaleString()}`);

                if (processedResults.severeList.length || processedResults.mediumList.length || processedResults.lowList.length)
                    setResultValue(<>
                        <div>{renderSummary(processedResults)}
                            {processedResults.numIgnoredNotices ? ` (but ${processedResults.numIgnoredNotices.toLocaleString()} ignored errors/warnings)` : ""}</div>
                        <RenderSuccessesSevereMediumLow results={processedResults} />
                    </>);
                else // no severe, medium, or low notices
                    setResultValue(<>
                        <div>{renderSummary(processedResults)}
                            {processedResults.numIgnoredNotices ? ` (with a total of ${processedResults.numIgnoredNotices.toLocaleString()} notices ignored)` : ""}</div>
                        <RenderSuccessesSevereMediumLow results={processedResults} />
                    </>);
            } else if (displayType === 'SingleList') {
                const processedResults = processNoticesToSingleList(rawCFResults, processOptions);
//                 console.log(`FileCheck got processed results with ${processedResults.successList.length.toLocaleString()} success message(s), ${processedResults.errorList.length.toLocaleString()} error(s) and ${processedResults.warningList.length.toLocaleString()} warning(s)
//   numIgnoredNotices=${processedResults.numIgnoredNotices.toLocaleString()} numSuppressedErrors=${processedResults.numSuppressedErrors.toLocaleString()} numSuppressedWarnings=${processedResults.numSuppressedWarnings.toLocaleString()}`);

                if (processedResults.warningList.length)
                    setResultValue(<>
                        <div>{renderSummary(processedResults)}
                            {processedResults.numIgnoredNotices ? ` (but ${processedResults.numIgnoredNotices.toLocaleString()} ignored errors/warnings)` : ""}</div>
                        <RenderSuccessesWarningsGradient results={processedResults} />
                    </>);
                else // no warnings
                    setResultValue(<>
                        <div>{renderSummary(processedResults)}
                            {processedResults.numIgnoredNotices ? ` (with a total of ${processedResults.numIgnoredNotices.toLocaleString()} notices ignored)` : ""}</div>
                        <RenderSuccessesWarningsGradient results={processedResults} />
                    </>);
            } else setResultValue(<b style={{ color: 'red' }}>Invalid displayType='{displayType}'</b>)
        })(); // end of async part in unnamedFunction
    }, []); // end of useEffect part

    // {/* <div className={classes.root}> */}
    return (
        <div className="Fred">
            {result}
        </div>
    );
};
// end of FileCheck()

const styles = theme => ({
    root: {
    },
});

export default withStyles(styles)(FileCheck);