const PROCESSOR_VERSION_STRING = '0.0.3';

// All of the following can be overriden with optionalOptions
const DEFAULT_MAXIMUM_SIMILAR_MESSAGES = 2; // Zero means no suppression of similar messages
const DEFAULT_ERROR_PRIORITY_LEVEL = 700; // This level or higher becomes an error (cf. warnings)
const DEFAULT_CUTOFF_PRIORITY_LEVEL = 0; // This level or lower gets excluded from the lists
const DEFAULT_IGNORE_PRIORITY_NUMBER_LIST = [];

export function processNotices(noticeObject, optionalOptions) {
    /*
        Expects to get an object with:
            successList: a list of strings describing what has been checked
            noticeList: a list of 5 components to notices, being:
                1/ A notice priority number in the range 1-1000.
                    Each different type of warning/error has a unique number
                      (but not each instance of those warnings/errors).
                    By default, notice priority numbers 700 and over are
                      considered `errors` and 0-699 are considered `warnings`.
                2/ The actual general description text of the notice
                3/ A zero-based integer index which indicates the position
                      of the error on the line or in the text as appropriate.
                    -1 indicates that this index does not contain any useful information.
                4/ An extract of the checked text which indicates the area
                      containing the problem.
                    Where helpful, some character substitutions have already been made,
                      for example, if the notice is about spaces,
                      it is generally helpful to display spaces as a visible
                      character in an attempt to best highlight the issue to the user.
                5/ A string indicating the context of the notice,
                        e.g., `in line 17 of 'someBook.usfm'.

        Available options are:
            errorPriorityLevel (integer; default is DEFAULT_ERROR_PRIORITY_LEVEL above)
            cutoffPriorityLevel (integer; default is DEFAULT_CUTOFF_PRIORITY_LEVEL above)
            maximumSimilarMessages (integer; default is DEFAULT_MAXIMUM_SIMILAR_MESSAGES above)
            sortBy ('AsFound' or 'ByPriority', default is 'AsFound')
            ignorePriorityNumberList (list of integers, default is empty list, list of notice priority numbers to be ignored)

        Returns an object with:
    */
    console.log("processNotices v" + PROCESSOR_VERSION_STRING, "with options=" + JSON.stringify(optionalOptions));
    console.log("  Given " + noticeObject.successList.length.toLocaleString() + " success string(s) plus " + noticeObject.noticeList.length.toLocaleString() + " notice(s)");

    // Check that notice priority numbers are unique (to detect programming errors)
    // May be commented out of production code
    let numberStore = {};
    let errorList = [];
    for (let thisNotice of noticeObject.noticeList) {
        const thisPriority = thisNotice[0], thisMsg = thisNotice[1];
        const oldMsg = numberStore[thisPriority];
        if (oldMsg && oldMsg!=thisMsg && errorList.indexOf(thisPriority)<0
          && !thisMsg.endsWith(' character after space')) {
            console.log("PROGRAMMING ERROR:", thisPriority, "has at least two messages: '"+oldMsg+"' and '"+thisMsg+"'");
            errorList.push(thisPriority); // so that we only give the error once
        }
        numberStore[thisPriority] = thisMsg;
    }

    let resultObject = {
        successList: noticeObject.successList, // Just passes on exactly what strings we were given
        errorList: [], warningList: [],
        numIgnoredNotices: 0, numSuppressedErrors: 0, numSuppressedWarnings: 0,
        givenOptions: optionalOptions, // Just helpfully includes what we were given (may be undefined)
    };

    // Fetch our processing parameters
    let ignorePriorityNumberList;
    try {
        ignorePriorityNumberList = optionalOptions.ignorePriorityNumberList;
    } catch (e) {}
    if (ignorePriorityNumberList === undefined) {
        ignorePriorityNumberList = DEFAULT_IGNORE_PRIORITY_NUMBER_LIST;
        // console.log("Using default ignorePriorityNumberList=" + ignorePriorityNumberList);
    } else
        console.log("Using supplied ignorePriorityNumberList=" + ignorePriorityNumberList, "cf. default="+DEFAULT_IGNORE_PRIORITY_NUMBER_LIST);
    let sortBy;
    try {
        sortBy = optionalOptions.sortBy;
    } catch (e) {}
    if (sortBy === undefined) {
        sortBy = 'AsFound';
        // console.log("Using default sortBy='" + sortBy + "'");
    } else
        console.log("Using supplied sortBy='" + sortBy + "' cf. default='AsFound'");
    let errorPriorityLevel;
    try {
        errorPriorityLevel = optionalOptions.errorPriorityLevel;
    } catch (e) {}
    if (errorPriorityLevel === undefined) {
        errorPriorityLevel = DEFAULT_ERROR_PRIORITY_LEVEL;
        // console.log("Using default errorPriorityLevel=" + errorPriorityLevel);
    } else
        console.log("Using supplied errorPriorityLevel=" + errorPriorityLevel, "cf. default="+DEFAULT_ERROR_PRIORITY_LEVEL);
    let cutoffPriorityLevel;
    try {
        cutoffPriorityLevel = optionalOptions.cutoffPriorityLevel;
    } catch (e) {}
    if (cutoffPriorityLevel === undefined) {
        cutoffPriorityLevel = DEFAULT_CUTOFF_PRIORITY_LEVEL;
        // console.log("Using default cutoffPriorityLevel=" + cutoffPriorityLevel);
    } else
        console.log("Using supplied cutoffPriorityLevel=" + cutoffPriorityLevel, "cf. default="+DEFAULT_CUTOFF_PRIORITY_LEVEL);
    if (cutoffPriorityLevel > errorPriorityLevel)
        resultObject.errorList.push([999,"Cutoff level must not be higher than error level", -1, "("+cutoffPriorityLevel+" vs "+errorPriorityLevel+")", " in processNotices options"]);
    let maximumSimilarMessages;
    try {
        maximumSimilarMessages = optionalOptions.maximumSimilarMessages;
    } catch (e) {}
    if (maximumSimilarMessages === undefined) {
        maximumSimilarMessages = DEFAULT_MAXIMUM_SIMILAR_MESSAGES;
        // console.log("Using default maximumSimilarMessages=" + maximumSimilarMessages);
    } else
        console.log("Using supplied maximumSimilarMessages=" + maximumSimilarMessages, "cf. default="+DEFAULT_MAXIMUM_SIMILAR_MESSAGES);

    // Specialised processing
    // If have s5 marker warnings, add one error
    for (let thisNotice of noticeObject.noticeList) {
        if (thisNotice[1].indexOf('\\s5') >= 0) {
            noticeObject.noticeList.push([errorPriorityLevel+1, "\\s5 fields should be coded as \\ts\\* milestones", -1, '', " in "+noticeObject.checkedName]);
            break;
        }
    }

    // Remove any notices that they have asked us to ignore
    let remainingNoticeList;
    if (ignorePriorityNumberList.length) {
        // console.log("Doing ignore of", ignorePriorityNumberList.length,"value(s)");
        remainingNoticeList = [];
        for (let thisNotice of noticeObject.noticeList) {
            if (ignorePriorityNumberList.indexOf(thisNotice[0]) >= 0)
                resultObject.numIgnoredNotices++;
            else
                remainingNoticeList.push(thisNotice);
            }
    } else
        remainingNoticeList = noticeObject.noticeList;
    if (resultObject.numIgnoredNotices)
        console.log("Ignored " + resultObject.numIgnoredNotices + " notices");

    // Sort the remainingNoticeList as required
    if (sortBy == 'ByPriority')
        remainingNoticeList.sort(function (a, b){return b[0]-a[0]});
    else if (sortBy != 'AsFound')
        console.log("ERROR: Sorting '"+sortBy+"' is not implemented yet!!!");

    // Count the number of occurrences of each message
    let allTotals = {};
    for (let thisNotice of remainingNoticeList)
        if (isNaN(allTotals[thisNotice[0]])) allTotals[thisNotice[0]] = 1;
        else allTotals[thisNotice[0]]++;

    // Check for repeated notices that should be compressed
    //  while simultaneously separating into error and warning lists
    let counter = {};
    for (let thisNotice of remainingNoticeList) {
        const thisPriority = thisNotice[0], thisMsg = thisNotice[1];
        const thisID = thisPriority + thisMsg; // Could have identical worded messages but with different priorities
        if (isNaN(counter[thisID])) counter[thisID] = 1;
        else counter[thisID]++;
        if (thisPriority < cutoffPriorityLevel)
            resultObject.numSuppressedWarnings++;
        else if (maximumSimilarMessages>0 && counter[thisID] == maximumSimilarMessages+1) {
            if (thisPriority >= errorPriorityLevel) {
                const numSuppressed = allTotals[thisPriority] - maximumSimilarMessages;
                resultObject.errorList.push([-1, thisMsg, -1, '', " ◄ "+numSuppressed.toLocaleString()+" MORE SIMILAR ERROR"+(numSuppressed==1?'':'S')+" SUPPRESSED"]);
                resultObject.numSuppressedErrors++;
            } else {
                const numSuppressed = allTotals[thisPriority] - maximumSimilarMessages;
                resultObject.warningList.push([-1, thisMsg, -1, '', " ◄ "+numSuppressed.toLocaleString()+" MORE SIMILAR WARNING"+(numSuppressed==1?'':'S')+" SUPPRESSED"]);
                resultObject.numSuppressedWarnings++;
            }
        } else if (maximumSimilarMessages>0 && counter[thisID] > maximumSimilarMessages+1) {
            if (thisPriority >= errorPriorityLevel)
                resultObject.numSuppressedErrors++;
            else
                resultObject.numSuppressedWarnings++;
        } else if (thisPriority >= errorPriorityLevel)
            resultObject.errorList.push(thisNotice);
        else
            resultObject.warningList.push(thisNotice);
    }

    // console.log("processNotices is returning", resultObject.successList.length, "successes,", resultObject.errorList.length, "errors, and", resultObject.warningList.length, "warnings");
    // console.log("  numIgnoredNotices="+resultObject.numIgnoredNotices, "numSuppressedErrors="+resultObject.numSuppressedErrors, "numSuppressedWarnings="+resultObject.numSuppressedWarnings);
    return resultObject;
}
// end of processNotices function


export default processNotices;