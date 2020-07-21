import * as gitApi from '../../core/getApi';
import { consoleLogObject } from '../../core/utilities';
import Path from 'path';
import localforage from 'localforage';

const baseURL = 'https://git.door43.org/';
const testURL = 'https://bg.door43.org/';

const rcStore = localforage.createInstance({
    driver: [localforage.INDEXEDDB],
    name: 'rc-store',
});


export async function getBlobContent(k, v) {
    // console.log("getBlobContent", k, v);
    let sha = v.sha;
    //let uri = v.url;
    let blob;
    try {
        blob = await rcStore.getItem(sha);
    } catch (error) {
        const err = "rcStore.getItem() Error:" + error;
        throw new Error(err);
    }
    blob = JSON.parse(blob);
    let content;
    try {
        content = atob(blob.content);
    } catch (error) {
        const err = "atob() Error on:" + k + " is:" + error;
        throw new Error(err);
    }
    // console.log("getBlobContent returning", content.length.toLocaleString());
    return content;
}


/*
async function getCheckResults(treeMap) {
    console.log("getCheckResults", treeMap);
    let allWords = [];
    let allL1Counts = 0;
    for (const [k, v] of treeMap.entries()) {
        let sha = v.sha;
        //let uri = v.url;
        let blob;
        try {
            blob = await rcStore.getItem(sha);
        } catch (error) {
            const err = "rcStore.getItem() Error:" + error;
            throw new Error(err);
        }
        blob = JSON.parse(blob);
        let content;
        try {
            content = atob(blob.content);
        } catch (error) {
            const err = "atob() Error on:" + k + " is:" + error;
            throw new Error(err);
        }
        let ext = k.split('.').pop();
        let format = "string";
        if (ext === "md") {
            format = "markdown";
        } else if (ext === "tsv") {
            format = "utn";
        } else if (ext === "usfm") {
            format = "usfm";
        }
        let results = wordCount(content, format);
        for (let i = 0; i < results.allWords.length; i++) {
            allWords.push(results.allWords[i])
        }
        allL1Counts += results.l1count;
        // now update the blob with word count results
        blob.path = k;
        blob.total = results.total;
        blob.distinct = results.distinct;
        blob.l1count = results.l1count;
        blob.allWords = results.allWords;
        blob.wordFrequency = results.wordFrequency;
        try {
            await rcStore.setItem(sha, JSON.stringify(blob));
        } catch (error) {
            const err = "rcStore.setItem() Error:" + error;
            throw new Error(err);
        }
        //console.log(k," Totals:",results.total)
    }
    let results = wordCount(allWords.join('\n'), "string");
    results.l1count = allL1Counts;
    console.log("getCheckResults returning", results);
    return results;
}
*/


async function getBlobs(treeMap) {
    // console.log("getBlobs", treeMap);
    let data = [];
    const params = 'per_page=9999'
    for (const [k, v] of treeMap.entries()) {
        let sha = v.sha;
        let uri = v.url;
        uri += '?per_page=99999'
        // test for already fetched
        let x;
        try {
            x = await rcStore.getItem(sha);
        } catch (error) {
            const err = "rcStore.getItem() Error:" + error;
            throw new Error(err);
        }
        if (x !== null) {
            // already have it - no need to fetch
            continue;
        }
        try {
            data = await gitApi.getURL({ uri });
        } catch (error) {
            const err = "getBlob() Error on:" + k + " is:" + error;
            throw new Error(err);
        }
        try {
            await rcStore.setItem(sha, JSON.stringify(data));
        } catch (error) {
            const err = "rcStore.setItem() Error:" + error;
            throw new Error(err);
        }
    }
}

async function treeRecursion(owner, repo, sha, filterpath, filetype, traversalpath, treeMap) {
    // console.log("treeRecursion", "owner=" + owner, "repo=" + repo, "sha=" + sha, "filterpath=" + filterpath,
    //     "filetype=" + filetype, "traversalpath=", traversalpath, "treeMap=" + treeMap);
    const uri = Path.join('api/v1/repos', owner, repo, 'git/trees', sha);
    const url = baseURL + uri; // NOT CORRECT -- but it will probably work for now ...........................
    let result;
    try {
        result = await fetch(url);
    } catch (error) {
        const err = "treeRecursion() Error:" + error;
        console.error(err);
        throw new Error(err);
    }
    let _tree = await result.json();
    let tree = _tree.tree;
    // consoleLogObject("fetched tree", tree);

    let max = filterpath.length;
    if (max === undefined) max = 0;

    for (let i = 0; i < tree.length; i++) {
        let tpath = tree[i].path;

        // Ignore standard git metadata and similar files/folders
        if (tpath === '.github' || tpath === '.gitattributes' || tpath === '.gitignore') {
            console.log("  Ignoring", tpath)
            continue;
        }

        // console.log(" ", i, tpath);
        traversalpath.push(tpath)
        // console.log("Traversal:", traversalpath.join('/'));
        if (max !== 0) {
            // Here we see if the need to prune the tree
            // by only traversing where the user input directs us

            // first get the min of input filter array size
            // and the traversal array size
            let tsize = traversalpath.length;
            if (tsize === undefined) tsize = 0;
            if (tsize < max) {
                max = tsize
            }
            let recurseFlag = true;
            for (let i = 0; i < max; i++) {
                if (filterpath[i] === traversalpath[i]) continue;
                recurseFlag = false;
                break;
            }
            // if we have a mismatch, then prune by not recursing
            if (!recurseFlag) {
                traversalpath.pop();
                continue;
            };
        }
        if (tree[i].type === 'tree') {
            await treeRecursion(owner, repo,
                tree[i].sha,
                filterpath, filetype,
                traversalpath,
                treeMap
            );
            traversalpath.pop();
            continue;
        }

        // at this point, we are looking at a file
        // Two cases:
        // a) the user input explicitly points to a single file
        // b) the user input was entire repo or a folder in repo
        // in case a), always take the file for counting, no matter the type
        // in case b), restrict to count only expected file types for repo
        // case a) is detected by observing that the traversal path and
        // the path filterpath are the same size; that will be true only
        // if the user input was to a single file.

        let mkey = traversalpath.join('/');
        // Case A. URL is to a single file
        if (traversalpath.length === filterpath.length) {
            treeMap.set(mkey, tree[i])
        } else {
            // Case B. only count if it matches the expected filetype
            let ext = mkey.split('/').pop().split('.').pop();
            if (!filetype || ext === filetype) {
                treeMap.set(mkey, tree[i])
            }
        }
        // pop the path array and continue to next one in tree
        traversalpath.pop();
    }
    if (treeMap.size === 0) {
        const err = "No matching files with provided URL=" + url;
        throw new Error(err);
    }
    // console.log("treeRecursion finished");
    return;
}

export async function fetchRepo({ url }) {
    // console.log("helpers.fetchRepo", url);
    if (!(url.startsWith(baseURL) || url.startsWith(testURL))) {
        throw new Error("URL must begin with " + baseURL + " (not " + url + ")");
    }
    url = url.replace(/\/$/, '');
    let lengthOfBaseURL = url.startsWith(baseURL) ? baseURL.length : testURL.length;
    let ownerRepoPath = url.substring(lengthOfBaseURL);
    let ownerEnd = ownerRepoPath.indexOf('/');
    let owner = ownerRepoPath.substring(0, ownerEnd);
    let repoEnd = ownerRepoPath.indexOf('/', ownerEnd + 1);
    let repo = ownerRepoPath.substring(ownerEnd + 1, repoEnd);
    let pathfilter = ownerRepoPath.substring(repoEnd + 1).split('/');
    if (repoEnd === -1) {
        repo = ownerRepoPath.substring(ownerEnd + 1);
        pathfilter = []
    }
    const sha = 'master';
    let traversalpath = [];

    // Step 1. Identify all files that need to be counted
    let treeMap = new Map();
    /*
    The key will be the full path to the file.
    The value will be an object like this:
    {
      "path": "README.md",
      "mode": "100644",
      "type": "blob",
      "size": 498,
      "sha": "a8d3267bda97f7933e8ca2fe416d06f53ed05d77",
      "url": "https://git.door43.org/api/v1/repos/cecil.new/tD-DataRestructure/git/blobs/a8d3267bda97f7933e8ca2fe416d06f53ed05d77"
    }

    These values are iterated over and all the blobs are fetched, stored and checked.
    */

    const filetype = null; // instead of 'tsv' or 'usfm', etc. -- fetches ALL filetypes

    // console.log("treeRecursion() at ",Date.now())
    await treeRecursion(owner, repo, sha, pathfilter, filetype, traversalpath, treeMap);
    // console.log("traversalpath", traversalpath);
    // console.log("treeMap", treeMap);

    // Step 2. Fetch all the identified files
    // console.log("getBlobs() at ",Date.now())
    await getBlobs(treeMap);

    // console.log("fetchRepo returning", treeMap);
    return treeMap;
}
