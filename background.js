
var g_ActiveDomain = false;
var g_StyleSheetURLs = [];


// Add a listener on tab update
// when we naviguate on the domain we want to get again the list of script, inline, external, etc
// kind of useless for single page app
chrome.tabs.onUpdated.addListener(function( tabId, changeInfo, tab){
    if( g_ActiveDomain !== false && tab.url ){
        if( tab.url.indexOf( g_ActiveDomain ) !== -1 ){
            getStylesheetFromPage( runTest );
        }
    }
});

// our command center
chrome.extension.onMessage.addListener( function(request, sender, sendResponse) {
    console.log( 'Background receive command', request.cmd );
    switch( request.cmd ){
        case 'returnStylesheetURL':
            downloadStylesheet( request.url );
            break;

        case 'returnInlineStyle':
            processInlineStyles( request.styles );
            break;

        case 'getUnusedSelector':
            sendResponse({ selectors: mDomain.getUnUsed() });
            break;
            break;

        case 'updateUsage':
            mDomain.updateUsage( request.selectors );
            break;

        case 'runTest':
            runTest();
            break;

        case 'setDomain':
            setDomain( request.domain );
            break;

        case 'openResultsPage':
            chrome.tabs.create({
                url: chrome.extension.getURL('results/results.html')
            });
            break;

        case 'getStats':
            sendResponse( mDomain.getMap() );
            break;
    }
});

//======================================================================================================================
//======================================================================================================================
// BACKGROUND FUNCTIONS
//======================================================================================================================
//======================================================================================================================

/**
 * Get all the styling of the page
 * @param {Function} cb Callback to run when the style have been found
 */
function getStylesheetFromPage( cb ){
    console.log( 'Get style from the page' );
    chrome.tabs.executeScript(null, { file: "contentScript/getStyleSheetURL.js" }, cb);
    chrome.tabs.executeScript(null, { file: "contentScript/getInlineStyle.js" }, cb);
}


function setDomain( dom ){
    console.log( 'Set domain', dom );
    g_ActiveDomain = dom;
    mDomain.reset();
    chrome.tabs.reload();
}


function runTest(){
    console.log( 'runTest' );
    chrome.tabs.executeScript(null, { file: "contentScript/testSelector.js" },function(){});
}

function processInlineStyles( arrText ){
    console.log('Found ', arrText.length, 'inline style');
    arrText.forEach( function( e ){
        postProcessStyleSheet( 'inline', e );
    });
}

/**
 * Download stylesheets
 *
 * @param {Array} urls
 */
function downloadStylesheet( urls ){
    console.log( 'Found ', urls.length, 'stylesheet to download' );
    urls.forEach( function( url ){

        // already fetched
        if( g_StyleSheetURLs.indexOf(url) !== -1 ){
            console.log( 'Stylesheets', url, ' already downloaded' );
            return;
        }

        var ajax = new XMLHttpRequest();
        ajax.onreadystatechange = function(){
            if( ajax.readyState == 4 && ajax.status == 200 ){
                postProcessStyleSheet( url, ajax.responseText );
            }
        }


        // dont fetch that!
        var dataURl = "data:text/css";
        if( url.substr(0, dataURl.length) == dataURl ){
            return;
        }

        console.log( 'DL stylesheet ', url);
        ajax.open( 'GET', url, false);
        ajax.send( null );
        g_StyleSheetURLs.push( url );
    });
}

/**
 * Handle a blobl of css selector
 *
 * @param {string} fileSrc  Where this blob is coming from
 * @param {stirng} text     The css blob
 */
function postProcessStyleSheet( fileSrc, text ){
    console.log( 'Process stylesheet from ', fileSrc, 'length ', text.length );
    var selectors = extractSelector( text );
    mDomain.addSelectors( fileSrc, selectors );
}

/**
 * Extract the selector from a string
 *
 * @TODO ignore the :before, :hover, ...
 *
 * @param {String} text
 * @returns {Array}
 */
function extractSelector( text ){
    var foundSelectors = [],
        selectorGroup = [];

    // replace } with a macro, that we are going to split on
    text = text.replace( /}/g, "}@#@" );

    // empty content of curly bracket
    text = text.replace( /{[\s\S]+?}/mg , "");

    // remove comments
    text = text.replace( /\/\*[\s\S]+?\*\//mg , "");

    // now for selector, remove empty and explode on 'c'
    selectorGroup = text.split( "@#@" );

    selectorGroup.forEach(function( selectors ){
        if( !selectors.length ){
            return;
        }
        selectors.split( ',' ).forEach(function( selector ){
            if( selector.length ){
                foundSelectors.push( selector );
            }
        });
    });

    // return an array of selectors
    return foundSelectors;
}





