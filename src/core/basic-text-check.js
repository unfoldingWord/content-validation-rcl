import { isWhitespace, countOccurrences } from './text-handling-functions'


export function doBasicTextChecks(fieldName, fieldText, allowedLinks, optionalFieldLocation, optionalOptions) {
    // Does basic checks for small errors like leading/trailing spaces, etc.

    // fieldName (str): Used for identification
    // fieldText (str): The field being checked
    // allowedLinks (bool): doesn't check links -- only checks lack of links
    // optionalFieldLocation (str): Used to inform where this field is located

    // We assume that checking for compulsory fields is done elsewhere

    // Returns an error list and a warning list
    //  Both lists contain lists of four objects:
    //      1/ the error description string
    //      2/ the 0-based index for the position in the string (or -1 if irrelevant)
    //      3/ a short extract of the string containing the error (or empty-string if irrelevant)
    //      4/ the detailed location string
    //  (Returned in this way for more intelligent processing at a higher level)

    let result = { noticeList: [] };

    function addNotice(priority, message, index, extract, location) {
        // console.log("dBTC Notice: (priority="+priority+") "+message+(index > 0 ? " (at character " + index + 1 + ")" : "") + (extract ? " " + extract : "") + location);
        console.assert(typeof priority == 'number', "addNotice: 'priority' parameter should be a number not a '"+(typeof priority)+"'");
        console.assert(typeof message == 'string', "addNotice: 'message' parameter should be a string");
        console.assert(typeof index == 'number', "addNotice: 'index' parameter should be a number not a '"+(typeof priority)+"'");
        console.assert(typeof extract == 'string', "addNotice: 'extract' parameter should be a string");
        console.assert(typeof location == 'string', "addNotice: 'location' parameter should be a string");
        result.noticeList.push([priority, message, index, extract, location]);
    }

    if (!fieldText) // Nothing to check
        return result;

    // Create our more detailed location string by prepending the fieldName
    let ourAtString = " in '" + fieldName + "'";
    if (optionalFieldLocation) {
        if (optionalFieldLocation[0] != ' ') ourAtString += ' ';
        ourAtString += optionalFieldLocation;
    }

    if (isWhitespace(fieldText)) {
        addNotice(638, "Only found whitespace", -1, "", ourAtString);
        return result;
    }

    let ix = fieldText.indexOf('<<<<<<<');
    if (ix >= 0) {
        let iy = ix + 5; // Want extract to focus more on what follows
        const extract = (iy > 5 ? '…' : '') + fieldText.substring(iy - 5, iy + 6).replace(/ /g, '␣') + (iy + 6 < fieldText.length ? '…' : '')
        addNotice(993, "Unresolved GIT conflict", ix, extract, ourAtString);
    } else {
        ix = fieldText.indexOf('=======');
        if (ix >= 0) {
            let iy = ix + 5; // Want extract to focus more on what follows
            const extract = (iy > 5 ? '…' : '') + fieldText.substring(iy - 5, iy + 6).replace(/ /g, '␣') + (iy + 6 < fieldText.length ? '…' : '')
            addNotice(992, "Unresolved GIT conflict", ix, extract, ourAtString);
        } else {
            ix = fieldText.indexOf('>>>>>>>>');
            if (ix >= 0) {
                let iy = ix + 5; // Want extract to focus more on what follows
                const extract = (iy > 5 ? '…' : '') + fieldText.substring(iy - 5, iy + 6).replace(/ /g, '␣') + (iy + 6 < fieldText.length ? '…' : '')
                addNotice(991, "Unresolved GIT conflict", ix, extract, ourAtString);
            }
        }
    }

    if (fieldText[0] == ' ') {
        const extract = fieldText.substring(0, 10).replace(/ /g, '␣') + (fieldText.length > 10 ? '…' : '');
        addNotice(203, "Unexpected leading space" + (fieldText[1] == ' ' ? "s" : ""), 0, extract, ourAtString);
    }
    if (fieldText.substring(0, 4) == '<br>' || fieldText.substring(0, 5) == '<br/>' || fieldText.substring(0, 6) == '<br />') {
        const extract = fieldText.substring(0, 10) + (fieldText.length > 10 ? '…' : '');
        addNotice(205, "Unexpected leading break", 0, extract, ourAtString);
    }
    if (fieldText[fieldText.length - 1] == ' ') {
        const extract = (fieldText.length > 10 ? '…' : '') + fieldText.substring(fieldText.length - 10).replace(/ /g, '␣');
        addNotice(202, "Unexpected trailing space(s)", fieldText.length - 1, extract, ourAtString);
    }
    if (fieldText.substring(fieldText.length - 4) == '<br>' || fieldText.substring(fieldText.length - 5) == '<br/>' || fieldText.substring(fieldText.length - 6) == '<br />') {
        const extract = (fieldText.length > 10 ? '…' : '') + fieldText.substring(fieldText.length - 10);
        addNotice(204, "Unexpected trailing break", fieldText.length - 1, extract, ourAtString);
    }
    ix = fieldText.indexOf('  ');
    if (ix >= 0) {
        const extract = (ix > 5 ? '…' : '') + fieldText.substring(ix - 5, ix + 6).replace(/ /g, '␣') + (ix + 6 < fieldText.length ? '…' : '')
        addNotice(194, "Unexpected double spaces", ix, extract, ourAtString);
    }
    ix = fieldText.indexOf('\n');
    if (ix >= 0) {
        const extract = (ix > 5 ? '…' : '') + fieldText.substring(ix - 5, ix + 6) + (ix + 6 < fieldText.length ? '…' : '')
        addNotice(583, "Unexpected newLine character", ix, extract, ourAtString);
    }
    ix = fieldText.indexOf('\r');
    if (ix >= 0) {
        const extract = (ix > 5 ? '…' : '') + fieldText.substring(ix - 5, ix + 6) + (ix + 6 < fieldText.length ? '…' : '')
        addNotice(582, "Unexpected carriageReturn character", ix, extract, ourAtString);
    }
    ix = fieldText.indexOf('\xA0'); // non-break space
    if (ix >= 0) {
        const extract = (ix > 5 ? '…' : '') + fieldText.substring(ix - 5, ix + 6).replace(/\xA0/g, '⍽') + (ix + 6 < fieldText.length ? '…' : '')
        addNotice(581, "Unexpected non-break space character", ix, extract, ourAtString);
    }
    ix = fieldText.indexOf('\u202F'); // narrow non-break space
    if (ix >= 0) {
        const extract = (ix > 5 ? '…' : '') + fieldText.substring(ix - 5, ix + 6).replace(/\u202F/g, '⍽') + (ix + 6 < fieldText.length ? '…' : '')
        addNotice(580, "Unexpected narrow non-break space character", ix, extract, ourAtString);
    }
    ix = fieldText.indexOf(' …');
    if (ix >= 0) {
        const extract = (ix > 5 ? '…' : '') + fieldText.substring(ix - 5, ix + 6) + (ix + 6 < fieldText.length ? '…' : '')
        addNotice(579, "Unexpected space before ellipse character", ix, extract, ourAtString);
    }
    ix = fieldText.indexOf('… ');
    if (ix >= 0) {
        const extract = (ix > 5 ? '…' : '') + fieldText.substring(ix - 5, ix + 6) + (ix + 6 < fieldText.length ? '…' : '')
        addNotice(578, "Unexpected space after ellipse character", ix, extract, ourAtString);
    }
    // Check for doubled punctuation chars (international)
    // Doesn't check for doubled forward slash coz that might occur in a link, e.g., https://etc…
    //  or doubled # coz that occurs in markdown
    let checkList = '.’\'(){}<>⟨⟩:,،、‒–—―…!‹›«»‐-?‘’“”\'";⁄·&*@•^†‡°¡¿※№÷×ºª%‰+−=‱¶′″‴§~_|‖¦©℗®℠™¤₳฿₵¢₡₢$₫₯֏₠€ƒ₣₲₴₭₺₾ℳ₥₦₧₱₰£៛₽₹₨₪৳₸₮₩¥';
    if (!allowedLinks) checkList += '[].' // Double square brackets can be part of markdown links, double periods can be part of a path
    for (let punctChar of checkList) {
        ix = fieldText.indexOf(punctChar + punctChar);
        if (ix >= 0) {
            let extract = (ix > 5 ? '…' : '') + fieldText.substring(ix - 5, ix + 6) + (ix + 6 < fieldText.length ? '…' : '')
            addNotice(577, "Unexpected doubled " + punctChar + " character", ix, extract, ourAtString);
        }
    }
    // Check for punctuation chars following space
    for (let punctChar of '.\')}>⟩:,،、‒–—―…!.‹›«»‐-?’”\'";/⁄·*@•^†‡°¡¿※#№÷×ºª%‰‱¶′″‴§~_|‖¦©℗®℠™¤₳฿₵¢₡₢$₫₯֏₠€ƒ₣₲₴₭₺₾ℳ₥₦₧₱₰£៛₽₹₨₪৳₸₮₩¥') {
        ix = fieldText.indexOf(' ' + punctChar);
        if (ix >= 0) {
            let extract = (ix > 5 ? '…' : '') + fieldText.substring(ix - 5, ix + 6) + (ix + 6 < fieldText.length ? '…' : '')
            addNotice(591, "Unexpected " + punctChar + " character after space", ix, extract, ourAtString);
        }
    }
    // Check for punctuation chars before space
    for (let punctChar of '\'[({<⟨،、‒–—―‹«‐‘“/⁄·@\•^†‡°¡¿※№×ºª%‰‱¶′″‴§~_|‖¦©℗℠™¤₳฿₵¢₡₢$₫₯֏₠€ƒ₣₲₴₭₺₾ℳ₥₦₧₱₰£៛₽₹₨₪৳₸₮₩¥') {
        ix = fieldText.indexOf(punctChar + ' ');
        if (ix >= 0) {
            let extract = (ix > 5 ? '…' : '') + fieldText.substring(ix - 5, ix + 6) + (ix + 6 < fieldText.length ? '…' : '')
            addNotice(592, "Unexpected space after " + punctChar + " character", ix, extract, ourAtString);
        }
    }

    // Check matched pairs
    for (let punctSet of ['[]', '()', '{}', '<>', '⟨⟩', '“”', '‹›', '«»']) {
        // Can't check '‘’' coz they might be used as apostrophe
        const leftChar = punctSet[0], rightChar = punctSet[1];
        const lCount = countOccurrences(fieldText, leftChar);
        const rCount = countOccurrences(fieldText, rightChar);
        if (lCount != rCount)
            addNotice(663, "Mismatched " + punctSet + " characters", -1, "(left=" + lCount.toLocaleString() + ", right=" + rCount.toLocaleString() + ")", ourAtString);
    }

    if (!allowedLinks) {
        // Simple check that there aren't any
        ix = fieldText.indexOf('://');
        if (ix == -1) ix = fieldText.indexOf('http');
        if (ix == -1) ix = fieldText.indexOf('ftp');
        // The following might have to be removed if text fields can contain email addresses
        if (ix == -1) ix = fieldText.indexOf('.org');
        if (ix == -1) ix = fieldText.indexOf('.com');
        if (ix == -1) ix = fieldText.indexOf('.info');
        if (ix == -1) ix = fieldText.indexOf('.bible');
        if (ix >= 0) {
            let extract = (ix > 5 ? '…' : '') + fieldText.substring(ix - 5, ix + 6) + (ix + 6 < fieldText.length ? '…' : '')
            addNotice(765, "Unexpected link", ix, extract, ourAtString);
        }
    }
    return result;
}
// end of doBasicTextChecks function

export default doBasicTextChecks;
