



"use strict";

/* =========================================================
   HR MATKA BACKEND
   COMPLETE REPLACEMENT
   PART 1 OF 5

   CORE:
   - HTTP SERVER
   - SOURCE SECURITY
   - TEXT HELPERS
   - JSON HELPERS
   - SERVER SIDE FETCH
   - DATE HELPERS
========================================================= */

const http = require("http");
const https = require("https");
const { URL } = require("url");


/* =========================================================
   SERVER CONFIG
========================================================= */

const HOST = "127.0.0.1";
const PORT = 5000;


/* =========================================================
   ALLOWED SOURCE HOSTS

   Sirf in approved hosts ko backend fetch karega.
========================================================= */

const ALLOWED_HOSTS = new Set([

    "dpbossss.boston",
    "www.dpbossss.boston",

    "sattamatkadpboss.mobi",
    "www.sattamatkadpboss.mobi",

    "spmatka.net",
    "www.spmatka.net",

    "mail.spmatka.net"

]);


/* =========================================================
   BASIC TEXT HELPERS
========================================================= */

function cleanText(value){

    return String(
        value ?? ""
    )
    .replace(
        /\u00a0/g,
        " "
    )
    .replace(
        /\r/g,
        " "
    )
    .replace(
        /\n/g,
        " "
    )
    .replace(
        /\t/g,
        " "
    )
    .replace(
        /\s+/g,
        " "
    )
    .trim();

}


function upper(value){

    return cleanText(
        value
    )
    .toUpperCase();

}


function digitsOnly(value){

    return String(
        value ?? ""
    )
    .replace(
        /\D/g,
        ""
    );

}


function normalizeMarketName(value){

    return upper(
        value
    )
    .replace(
        /[^A-Z0-9]+/g,
        " "
    )
    .replace(
        /\s+/g,
        " "
    )
    .trim();

}


/* =========================================================
   RESULT VALIDATORS
========================================================= */

function validPanel(value){

    return /^\d{3}$/.test(
        cleanText(
            value
        )
    );

}


function validJodi(value){

    return /^\d{2}$/.test(
        cleanText(
            value
        )
    );

}


function validSingle(value){

    return /^\d$/.test(
        cleanText(
            value
        )
    );

}


/* =========================================================
   PANEL -> SINGLE

   Example:
   470
   4+7+0 = 11
   single = 1
========================================================= */

function calculateSingle(panel){

    const digits =
        digitsOnly(
            panel
        );


    if(
        !/^\d{3}$/.test(
            digits
        )
    ){

        return "";

    }


    let total = 0;


    for(
        const digit of digits
    ){

        total +=
            Number(
                digit
            );

    }


    return String(
        total % 10
    );

}


/* =========================================================
   HTML ENTITY DECODE
========================================================= */

function decodeHtml(value){

    return String(
        value ?? ""
    )
    .replace(
        /&nbsp;/gi,
        " "
    )
    .replace(
        /&#160;/gi,
        " "
    )
    .replace(
        /&amp;/gi,
        "&"
    )
    .replace(
        /&quot;/gi,
        '"'
    )
    .replace(
        /&#39;/gi,
        "'"
    )
    .replace(
        /&lt;/gi,
        "<"
    )
    .replace(
        /&gt;/gi,
        ">"
    )
    .replace(
        /&#x2F;/gi,
        "/"
    )
    .replace(
        /&#47;/gi,
        "/"
    );

}


/* =========================================================
   HTML -> CLEAN TEXT
========================================================= */

function stripTags(value){

    let html =
        String(
            value ?? ""
        );


    html =
        html
        .replace(
            /<script[\s\S]*?<\/script>/gi,
            " "
        )
        .replace(
            /<style[\s\S]*?<\/style>/gi,
            " "
        )
        .replace(
            /<br\b[^>]*>/gi,
            " "
        )
        .replace(
            /<\/p>/gi,
            " "
        )
        .replace(
            /<\/div>/gi,
            " "
        )
        .replace(
            /<\/span>/gi,
            " "
        )
        .replace(
            /<[^>]+>/g,
            " "
        );


    return cleanText(
        decodeHtml(
            html
        )
    );

}


/* =========================================================
   JSON RESPONSE
========================================================= */

function sendJson(
    res,
    statusCode,
    data
){

    if(
        res.headersSent
    ){

        try{
            res.end();
        }
        catch(error){
            console.error(
                "Response End Error:",
                error
            );
        }

        return;
    }


    const output =
        JSON.stringify(
            data
        );


    res.writeHead(
        statusCode,
        {

            "Content-Type":
                "application/json; charset=utf-8",

            "Access-Control-Allow-Origin":
                "*",

            "Access-Control-Allow-Methods":
                "GET,POST,OPTIONS",

            "Access-Control-Allow-Headers":
                "Content-Type",

            "Cache-Control":
                "no-store"

        }
    );


    res.end(
        output
    );

}


/* =========================================================
   READ JSON REQUEST BODY
========================================================= */

function readJsonBody(req){

    return new Promise(
        function(resolve,reject){

            let body = "";
            let completed = false;


            req.on(
                "data",
                function(chunk){

                    if(completed){
                        return;
                    }


                    body +=
                        chunk.toString();


                    if(
                        Buffer.byteLength(
                            body,
                            "utf8"
                        )
                        >
                        1024 * 1024
                    ){

                        completed = true;

                        reject(
                            new Error(
                                "Request too large"
                            )
                        );

                        req.destroy();
                    }

                }
            );


            req.on(
                "end",
                function(){

                    if(completed){
                        return;
                    }


                    completed = true;


                    if(
                        !body.trim()
                    ){

                        resolve(
                            {}
                        );

                        return;
                    }


                    try{

                        const parsed =
                            JSON.parse(
                                body
                            );


                        resolve(
                            parsed
                        );

                    }
                    catch(error){

                        reject(
                            new Error(
                                "Invalid JSON body"
                            )
                        );

                    }

                }
            );


            req.on(
                "error",
                function(error){

                    if(completed){
                        return;
                    }


                    completed = true;

                    reject(
                        error
                    );

                }
            );

        }
    );

}


/* =========================================================
   NORMALIZE SOURCE URL

   Browser field se accidental spaces ya quotes
   remove karega.
========================================================= */

function normalizeSourceUrl(value){

    let raw =
        String(
            value ?? ""
        )
        .trim();


    /*
       Accidental surrounding quotes remove.
    */

    if(
        (
            raw.startsWith('"')
            &&
            raw.endsWith('"')
        )
        ||
        (
            raw.startsWith("'")
            &&
            raw.endsWith("'")
        )
    ){

        raw =
            raw.slice(
                1,
                -1
            )
            .trim();

    }


    /*
       Invisible Unicode spaces remove.
    */

    raw =
        raw
        .replace(
            /[\u200B-\u200D\uFEFF]/g,
            ""
        )
        .trim();


    return raw;

}


/* =========================================================
   URL VALIDATION
========================================================= */

function validateSourceUrl(value){

    const raw =
        normalizeSourceUrl(
            value
        );


    if(!raw){

        throw new Error(
            "Source URL Required"
        );

    }


    let parsed;


    try{

        parsed =
            new URL(
                raw
            );

    }
    catch(error){

        throw new Error(
            "Invalid Source URL"
        );

    }


    /*
       Security rule:
       external historical/live source HTTPS hi hoga.
    */

    if(
        String(
            parsed.protocol
        )
        .toLowerCase()
        !==
        "https:"
    ){

        throw new Error(
            "Only HTTPS URL Allowed"
        );

    }


    const hostname =
        String(
            parsed.hostname || ""
        )
        .toLowerCase();


    if(
        !ALLOWED_HOSTS.has(
            hostname
        )
    ){

        throw new Error(
            "Source Domain Not Allowed: "
            +
            hostname
        );

    }


    /*
       Username/password embedded URL reject.
    */

    if(
        parsed.username
        ||
        parsed.password
    ){

        throw new Error(
            "Source URL Authentication Not Allowed"
        );

    }


    return parsed.toString();

}


/* =========================================================
   FETCH EXTERNAL HTML

   Server-side fetch:
   browser CORS problem nahi hogi.
========================================================= */

function fetchHtml(
    url,
    redirectCount = 0
){

    return new Promise(
        function(resolve,reject){

            if(
                redirectCount > 5
            ){

                reject(
                    new Error(
                        "Too many redirects"
                    )
                );

                return;
            }


            let safeUrl;


            try{

                safeUrl =
                    validateSourceUrl(
                        url
                    );

            }
            catch(error){

                reject(
                    error
                );

                return;
            }


            let completed = false;


            const options = {

                headers:{

                    "User-Agent":
                        "Mozilla/5.0 "
                        +
                        "(Windows NT 10.0; Win64; x64) "
                        +
                        "AppleWebKit/537.36 "
                        +
                        "(KHTML, like Gecko) "
                        +
                        "Chrome/140.0 Safari/537.36",

                    "Accept":
                        "text/html,"
                        +
                        "application/xhtml+xml,"
                        +
                        "application/xml;q=0.9,"
                        +
                        "*/*;q=0.8",

                    "Accept-Language":
                        "en-IN,en-US;q=0.9,en;q=0.8",

                    "Cache-Control":
                        "no-cache",

                    "Pragma":
                        "no-cache",

                    "Connection":
                        "close"

                },

                timeout:
                    20000

            };


            const request =
                https.get(
                    safeUrl,
                    options,
                    function(response){

                        /* =================================
                           REDIRECT
                        ================================= */

                        if(
                            response.statusCode >= 300
                            &&
                            response.statusCode < 400
                            &&
                            response.headers.location
                        ){

                            let redirectUrl;


                            try{

                                redirectUrl =
                                    new URL(
                                        response.headers.location,
                                        safeUrl
                                    )
                                    .toString();

                            }
                            catch(error){

                                response.resume();


                                if(!completed){

                                    completed = true;

                                    reject(
                                        new Error(
                                            "Invalid Redirect URL"
                                        )
                                    );

                                }


                                return;
                            }


                            response.resume();


                            fetchHtml(
                                redirectUrl,
                                redirectCount + 1
                            )
                            .then(
                                function(html){

                                    if(completed){
                                        return;
                                    }


                                    completed = true;

                                    resolve(
                                        html
                                    );

                                }
                            )
                            .catch(
                                function(error){

                                    if(completed){
                                        return;
                                    }


                                    completed = true;

                                    reject(
                                        error
                                    );

                                }
                            );


                            return;
                        }


                        /* =================================
                           HTTP ERROR
                        ================================= */

                        if(
                            response.statusCode !== 200
                        ){

                            const statusCode =
                                Number(
                                    response.statusCode || 0
                                );


                            response.resume();


                            if(!completed){

                                completed = true;

                                reject(
                                    new Error(
                                        "Source HTTP "
                                        +
                                        statusCode
                                    )
                                );

                            }


                            return;
                        }


                        let html = "";


                        response.setEncoding(
                            "utf8"
                        );


                        response.on(
                            "data",
                            function(chunk){

                                if(completed){
                                    return;
                                }


                                html +=
                                    chunk;


                                if(
                                    Buffer.byteLength(
                                        html,
                                        "utf8"
                                    )
                                    >
                                    8 * 1024 * 1024
                                ){

                                    completed = true;

                                    request.destroy();


                                    reject(
                                        new Error(
                                            "Source page too large"
                                        )
                                    );

                                }

                            }
                        );


                        response.on(
                            "end",
                            function(){

                                if(completed){
                                    return;
                                }


                                completed = true;

                                resolve(
                                    html
                                );

                            }
                        );


                        response.on(
                            "error",
                            function(error){

                                if(completed){
                                    return;
                                }


                                completed = true;

                                reject(
                                    error
                                );

                            }
                        );

                    }
                );


            request.on(
                "timeout",
                function(){

                    if(completed){
                        return;
                    }


                    completed = true;

                    request.destroy();


                    reject(
                        new Error(
                            "Source request timeout"
                        )
                    );

                }
            );


            request.on(
                "error",
                function(error){

                    if(completed){
                        return;
                    }


                    completed = true;

                    reject(
                        error
                    );

                }
            );

        }
    );

}


/* =========================================================
   SAFE DATE CREATOR
========================================================= */

function createSafeDate(
    day,
    month,
    year
){

    day =
        Number(
            day
        );


    month =
        Number(
            month
        );


    year =
        Number(
            year
        );


    if(
        !Number.isInteger(day)
        ||
        !Number.isInteger(month)
        ||
        !Number.isInteger(year)
    ){

        return null;
    }


    /*
       26 -> 2026
       18 -> 2018
    */

    if(
        year >= 0
        &&
        year < 100
    ){

        year += 2000;
    }


    const date =
        new Date(
            year,
            month - 1,
            day
        );


    if(
        Number.isNaN(
            date.getTime()
        )
    ){

        return null;
    }


    if(
        date.getFullYear() !== year
        ||
        date.getMonth() !== month - 1
        ||
        date.getDate() !== day
    ){

        return null;
    }


    date.setHours(
        0,
        0,
        0,
        0
    );


    return date;

}


/* =========================================================
   PARSE DISPLAY DATE

   Supports:
   DD/MM/YYYY
   DD-MM-YYYY
   DD/MM/YY
   DD-MM-YY
========================================================= */

function parseDate(value){

    const raw =
        cleanText(
            value
        );


    const match =
        raw.match(
            /(^|\D)(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4}|\d{2})(?!\d)/
        );


    if(!match){

        return null;
    }


    return createSafeDate(

        match[2],

        match[3],

        match[4]

    );

}


/* =========================================================
   API DATE

   Supports:
   YYYY-MM-DD
   DD/MM/YYYY
   DD-MM-YYYY
========================================================= */

function parseApiDate(value){

    const raw =
        cleanText(
            value
        );


    if(!raw){

        return null;
    }


    const iso =
        raw.match(
            /^(\d{4})-(\d{2})-(\d{2})$/
        );


    if(iso){

        return createSafeDate(

            iso[3],

            iso[2],

            iso[1]

        );
    }


    return parseDate(
        raw
    );

}


/* =========================================================
   FORMAT DATE -> DD/MM/YYYY
========================================================= */

function formatDate(date){

    if(
        !(date instanceof Date)
        ||
        Number.isNaN(
            date.getTime()
        )
    ){

        return "";
    }


    const day =
        String(
            date.getDate()
        )
        .padStart(
            2,
            "0"
        );


    const month =
        String(
            date.getMonth() + 1
        )
        .padStart(
            2,
            "0"
        );


    return (
        day
        +
        "/"
        +
        month
        +
        "/"
        +
        date.getFullYear()
    );

}


/* =========================================================
   ADD DAYS
========================================================= */

function addDays(
    date,
    days
){

    const output =
        new Date(
            date.getTime()
        );


    output.setDate(
        output.getDate()
        +
        Number(
            days || 0
        )
    );


    output.setHours(
        0,
        0,
        0,
        0
    );


    return output;

}


/* =========================================================
   START OF DAY
========================================================= */

function startOfDay(date){

    const output =
        new Date(
            date
        );


    output.setHours(
        0,
        0,
        0,
        0
    );


    return output;

}


/* =========================================================
   RANGE CHECK
========================================================= */

function inRange(
    date,
    fromDate,
    toDate
){

    if(
        !(date instanceof Date)
        ||
        !(fromDate instanceof Date)
        ||
        !(toDate instanceof Date)
    ){

        return false;
    }


    const current =
        startOfDay(
            date
        )
        .getTime();


    const from =
        startOfDay(
            fromDate
        )
        .getTime();


    const to =
        startOfDay(
            toDate
        )
        .getTime();


    return (
        current >= from
        &&
        current <= to
    );

}


/* =========================================================
   DEFAULT HISTORY RANGE
========================================================= */

function defaultHistoryFrom(){

    const date =
        new Date(
            2026,
            0,
            1
        );


    date.setHours(
        0,
        0,
        0,
        0
    );


    return date;

}


function defaultHistoryTo(){

    const date =
        new Date();


    date.setHours(
        0,
        0,
        0,
        0
    );


    return date;

}


/* =========================================================
   PART 1 COMPLETE
========================================================= */

console.log(
    "✅ SERVER PART 1 LOADED"
);



/* =========================================================
   HR MATKA BACKEND
   COMPLETE REPLACEMENT
   PART 2 OF 5

   HISTORICAL PARSER:
   - PANEL / JODI NORMALIZATION
   - TABLE ROW EXTRACTION
   - WEEK RANGE PARSING
   - DAILY RESULT PARSING
   - SPLIT OPEN/JODI/CLOSE PARSING
   - HISTORICAL RECORD CREATION
   - PRIMARY SOURCE HISTORY PARSER
========================================================= */


/* =========================================================
   PANEL NORMALIZATION
========================================================= */

function normalizePanel(value){

    const raw =
        cleanText(
            value
        );


    if(
        !raw
        ||
        raw.includes("*")
    ){

        return "";
    }


    const digits =
        digitsOnly(
            raw
        );


    if(
        digits.length !== 3
    ){

        return "";
    }


    return digits;

}


/* =========================================================
   JODI NORMALIZATION
========================================================= */

function normalizeJodi(value){

    const raw =
        cleanText(
            value
        );


    if(
        !raw
        ||
        raw.includes("*")
    ){

        return "";
    }


    const digits =
        digitsOnly(
            raw
        );


    if(
        digits.length === 1
    ){

        return digits.padStart(
            2,
            "0"
        );
    }


    if(
        digits.length === 2
    ){

        return digits;
    }


    return "";

}


/* =========================================================
   TABLE ROW EXTRACTOR
========================================================= */

function extractTableRows(html){

    const rows = [];


    const source =
        String(
            html ?? ""
        );


    const rowRegex =
        /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;


    let rowMatch;


    while(
        (
            rowMatch =
            rowRegex.exec(
                source
            )
        )
        !==
        null
    ){

        const rowHtml =
            rowMatch[1];


        const cells = [];


        const cellRegex =
            /<(td|th)\b[^>]*>([\s\S]*?)<\/\1>/gi;


        let cellMatch;


        while(
            (
                cellMatch =
                cellRegex.exec(
                    rowHtml
                )
            )
            !==
            null
        ){

            cells.push(
                stripTags(
                    cellMatch[2]
                )
            );
        }


        if(
            cells.length
        ){

            rows.push(
                cells
            );
        }

    }


    return rows;

}


/* =========================================================
   PAGE TITLE
========================================================= */

function getPageTitle(html){

    const match =
        String(
            html ?? ""
        )
        .match(
            /<title\b[^>]*>([\s\S]*?)<\/title>/i
        );


    if(!match){

        return "";
    }


    return stripTags(
        match[1]
    );

}


/* =========================================================
   WEEK RANGE PARSER

   Supports:
   26/02/18 to 04/03/18
   10/08/2026 to 16/08/2026
========================================================= */

function parseWeekRange(value){

    const raw =
        cleanText(
            value
        );


    const matches =
        raw.match(
            /\d{1,2}[\/\-]\d{1,2}[\/\-](?:\d{4}|\d{2})(?!\d)/g
        );


    if(
        !matches
        ||
        !matches.length
    ){

        return null;
    }


    const start =
        parseDate(
            matches[0]
        );


    if(!start){

        return null;
    }


    let end =
        addDays(
            start,
            6
        );


    if(
        matches.length >= 2
    ){

        const parsedEnd =
            parseDate(
                matches[1]
            );


        if(parsedEnd){

            end =
                parsedEnd;
        }

    }


    return {

        start,
        end

    };

}


/* =========================================================
   FIND WEEK CELL
========================================================= */

function findWeekCell(cells){

    if(
        !Array.isArray(
            cells
        )
    ){

        return null;
    }


    for(
        let index = 0;
        index < cells.length;
        index++
    ){

        const week =
            parseWeekRange(
                cells[index]
            );


        if(week){

            return {

                index,
                week

            };
        }

    }


    return null;

}


/* =========================================================
   DAILY RESULT CELL PARSER

   Supported examples:

   178-61-399
   178 61 399
   1 7 8 61 3 9 9
   178
========================================================= */

function parseDailyResultCell(value){

    const raw =
        cleanText(
            value
        );


    if(
        !raw
        ||
        raw === "-"
        ||
        raw === "--"
        ||
        upper(raw).includes(
            "HOLIDAY"
        )
    ){

        return null;
    }


    const withoutStars =
        raw
        .replace(
            /\*/g,
            ""
        )
        .trim();


    if(!withoutStars){

        return null;
    }


    /* =====================================================
       FORMAT:
       178-61-399
       178 61 399
    ===================================================== */

    const compact =
        raw.match(
            /(?:^|\D)(\d{3})\D+(\d{1,2})\D+(\d{3})(?:\D|$)/
        );


    if(compact){

        const openPanel =
            compact[1];


        const jodi =
            compact[2]
            .padStart(
                2,
                "0"
            );


        const closePanel =
            compact[3];


        if(
            validPanel(openPanel)
            &&
            validJodi(jodi)
            &&
            validPanel(closePanel)
        ){

            return {

                openPanel,

                openSingle:
                    calculateSingle(
                        openPanel
                    ),

                jodi,

                closeSingle:
                    calculateSingle(
                        closePanel
                    ),

                closePanel,

                complete:
                    true

            };
        }

    }


    /* =====================================================
       TOKEN BASED FORMAT:
       1 7 8 61 3 9 9
    ===================================================== */

    const tokens =
        raw.match(
            /\d+/g
        )
        ||
        [];


    if(
        tokens.length >= 7
        &&
        /^\d$/.test(tokens[0])
        &&
        /^\d$/.test(tokens[1])
        &&
        /^\d$/.test(tokens[2])
    ){

        const openPanel =
            tokens[0]
            +
            tokens[1]
            +
            tokens[2];


        const jodiToken =
            tokens[3];


        const closeTokens =
            tokens.slice(
                4,
                7
            );


        if(
            /^\d{1,2}$/.test(
                jodiToken
            )
            &&
            closeTokens.length === 3
            &&
            closeTokens.every(
                function(item){

                    return /^\d$/.test(
                        item
                    );
                }
            )
        ){

            const jodi =
                jodiToken.padStart(
                    2,
                    "0"
                );


            const closePanel =
                closeTokens.join(
                    ""
                );


            if(
                validPanel(openPanel)
                &&
                validJodi(jodi)
                &&
                validPanel(closePanel)
            ){

                return {

                    openPanel,

                    openSingle:
                        calculateSingle(
                            openPanel
                        ),

                    jodi,

                    closeSingle:
                        calculateSingle(
                            closePanel
                        ),

                    closePanel,

                    complete:
                        true

                };
            }

        }

    }


    /* =====================================================
       THREE TOKEN FORMAT:
       178 | 61 | 399
    ===================================================== */

    if(
        tokens.length >= 3
        &&
        /^\d{3}$/.test(
            tokens[0]
        )
        &&
        /^\d{1,2}$/.test(
            tokens[1]
        )
        &&
        /^\d{3}$/.test(
            tokens[2]
        )
    ){

        const openPanel =
            tokens[0];


        const jodi =
            tokens[1]
            .padStart(
                2,
                "0"
            );


        const closePanel =
            tokens[2];


        return {

            openPanel,

            openSingle:
                calculateSingle(
                    openPanel
                ),

            jodi,

            closeSingle:
                calculateSingle(
                    closePanel
                ),

            closePanel,

            complete:
                true

        };

    }


    /* =====================================================
       OPEN PANEL ONLY
    ===================================================== */

    const panel =
        normalizePanel(
            raw
        );


    if(
        validPanel(
            panel
        )
    ){

        return {

            openPanel:
                panel,

            openSingle:
                calculateSingle(
                    panel
                ),

            jodi:
                "",

            closeSingle:
                "",

            closePanel:
                "",

            complete:
                false

        };
    }


    return null;

}


/* =========================================================
   SPLIT DAY PARSER

   OPEN PANEL | JODI | CLOSE PANEL
========================================================= */

function parseSplitDay(
    openValue,
    jodiValue,
    closeValue
){

    const openPanel =
        normalizePanel(
            openValue
        );


    if(
        !validPanel(
            openPanel
        )
    ){

        return null;
    }


    const jodi =
        normalizeJodi(
            jodiValue
        );


    const closePanel =
        normalizePanel(
            closeValue
        );


    return {

        openPanel,

        openSingle:
            calculateSingle(
                openPanel
            ),

        jodi,

        closeSingle:
            validPanel(
                closePanel
            )
            ?
            calculateSingle(
                closePanel
            )
            :
            "",

        closePanel,

        complete:
            validPanel(
                closePanel
            )

    };

}


/* =========================================================
   HISTORICAL RECORD CREATOR

   IMPORTANT:
   settlementAllowed = false
========================================================= */

function createHistoricalRecord(
    market,
    date,
    openPanel,
    jodi,
    closePanel,
    source,
    sourceUrl
){

    const normalizedMarket =
        cleanText(
            market
        );


    const open =
        normalizePanel(
            openPanel
        );


    const close =
        normalizePanel(
            closePanel
        );


    let pair =
        normalizeJodi(
            jodi
        );


    if(
        !normalizedMarket
        ||
        !(date instanceof Date)
        ||
        !validPanel(
            open
        )
    ){

        return null;
    }


    const openSingle =
        calculateSingle(
            open
        );


    let closeSingle = "";
    let status = "OPEN";


    let result =
        open
        +
        "-"
        +
        openSingle
        +
        "*-***";


    if(
        validPanel(
            close
        )
    ){

        closeSingle =
            calculateSingle(
                close
            );


        if(
            !validJodi(
                pair
            )
        ){

            pair =
                openSingle
                +
                closeSingle;
        }


        result =
            open
            +
            "-"
            +
            pair
            +
            "-"
            +
            close;


        status =
            "COMPLETE";
    }


    const dateText =
        formatDate(
            date
        );


    const safeMarketId =
        normalizeMarketName(
            normalizedMarket
        )
        .replace(
            /\s+/g,
            "-"
        )
        .toLowerCase();


    return {

        id:
            "history-"
            +
            safeMarketId
            +
            "-"
            +
            dateText
            .replace(
                /\D/g,
                ""
            ),

        market:
            normalizedMarket,

        date:
            dateText,

        openPanel:
            open,

        openSingle,

        jodi:
            pair,

        closeSingle,

        closePanel:
            close,

        result,

        status,

        historical:
            true,

        settlementAllowed:
            false,

        source:
            cleanText(
                source
            ),

        sourceUrl:
            cleanText(
                sourceUrl
            ),

        importedAt:
            new Date()
            .toISOString()

    };

}


/* =========================================================
   PARSE SEVEN DAILY CELLS

   DATE | MON | TUE | WED | THU | FRI | SAT | SUN
========================================================= */

function parseSevenDayCells(
    resultCells,
    week,
    options,
    output
){

    let added = 0;


    const totalDays =
        Math.min(
            7,
            resultCells.length
        );


    for(
        let dayIndex = 0;
        dayIndex < totalDays;
        dayIndex++
    ){

        const date =
            addDays(
                week.start,
                dayIndex
            );


        if(
            !inRange(
                date,
                options.fromDate,
                options.toDate
            )
        ){

            continue;
        }


        const parsed =
            parseDailyResultCell(
                resultCells[
                    dayIndex
                ]
            );


        if(!parsed){

            continue;
        }


        const record =
            createHistoricalRecord(

                options.market,

                date,

                parsed.openPanel,

                parsed.jodi,

                parsed.closePanel,

                options.source,

                options.sourceUrl

            );


        if(record){

            output.push(
                record
            );


            added++;
        }

    }


    return added;

}


/* =========================================================
   PARSE 21-CELL SPLIT FORMAT

   MON = OPEN | JODI | CLOSE
   x 7 DAYS
========================================================= */

function parseTwentyOneDayCells(
    resultCells,
    week,
    options,
    output
){

    let added = 0;


    const availableDays =
        Math.min(
            7,
            Math.floor(
                resultCells.length / 3
            )
        );


    for(
        let dayIndex = 0;
        dayIndex < availableDays;
        dayIndex++
    ){

        const base =
            dayIndex * 3;


        const parsed =
            parseSplitDay(

                resultCells[
                    base
                ],

                resultCells[
                    base + 1
                ],

                resultCells[
                    base + 2
                ]

            );


        if(!parsed){

            continue;
        }


        const date =
            addDays(
                week.start,
                dayIndex
            );


        if(
            !inRange(
                date,
                options.fromDate,
                options.toDate
            )
        ){

            continue;
        }


        const record =
            createHistoricalRecord(

                options.market,

                date,

                parsed.openPanel,

                parsed.jodi,

                parsed.closePanel,

                options.source,

                options.sourceUrl

            );


        if(record){

            output.push(
                record
            );


            added++;
        }

    }


    return added;

}


/* =========================================================
   MAIN HISTORICAL TABLE PARSER

   PRIMARY SOURCE MODE:
   - Finds date range
   - Detects normal 7-cell rows
   - Falls back to 21-cell split rows
========================================================= */

function parseHistoricalTable(
    html,
    options
){

    options =
        options || {};


    const market =
        cleanText(
            options.market
        );


    const source =
        cleanText(
            options.source ||
            "Historical Source"
        );


    const sourceUrl =
        cleanText(
            options.sourceUrl ||
            ""
        );


    const fromDate =
        options.fromDate ||
        defaultHistoryFrom();


    const toDate =
        options.toDate ||
        defaultHistoryTo();


    const rows =
        extractTableRows(
            html
        );


    const output = [];


    for(
        const row of rows
    ){

        if(
            !Array.isArray(row)
            ||
            row.length < 2
        ){

            continue;
        }


        const weekData =
            findWeekCell(
                row
            );


        if(!weekData){

            continue;
        }


        const week =
            weekData.week;


        if(
            startOfDay(
                week.end
            )
            <
            startOfDay(
                fromDate
            )
            ||
            startOfDay(
                week.start
            )
            >
            startOfDay(
                toDate
            )
        ){

            continue;
        }


        const resultCells =
            row.slice(
                weekData.index + 1
            );


        if(
            !resultCells.length
        ){

            continue;
        }


        let added = 0;


        /*
           Most weekly pages:
           7 daily cells.
        */

        if(
            resultCells.length <= 10
        ){

            added =
                parseSevenDayCells(

                    resultCells,

                    week,

                    {
                        market,
                        source,
                        sourceUrl,
                        fromDate,
                        toDate
                    },

                    output

                );
        }


        /*
           Split result format:
           OPEN | JODI | CLOSE
        */

        if(
            added === 0
            &&
            resultCells.length >= 3
        ){

            added =
                parseTwentyOneDayCells(

                    resultCells,

                    week,

                    {
                        market,
                        source,
                        sourceUrl,
                        fromDate,
                        toDate
                    },

                    output

                );
        }


        /*
           Last fallback:
           first 7 cells try.
        */

        if(
            added === 0
            &&
            resultCells.length > 10
        ){

            parseSevenDayCells(

                resultCells.slice(
                    0,
                    7
                ),

                week,

                {
                    market,
                    source,
                    sourceUrl,
                    fromDate,
                    toDate
                },

                output

            );
        }

    }


    return output;

}


/* =========================================================
   HISTORY DEDUPE

   UNIQUE:
   MARKET + DATE

   COMPLETE result wins over OPEN-only.
========================================================= */

function dedupeHistory(records){

    const map =
        new Map();


    (
        Array.isArray(
            records
        )
        ?
        records
        :
        []
    )
    .forEach(
        function(record){

            if(!record){

                return;
            }


            const key =
                normalizeMarketName(
                    record.market
                )
                +
                "|"
                +
                cleanText(
                    record.date
                );


            const previous =
                map.get(
                    key
                );


            if(!previous){

                map.set(
                    key,
                    record
                );

                return;
            }


            const oldComplete =
                validPanel(
                    previous.closePanel
                );


            const newComplete =
                validPanel(
                    record.closePanel
                );


            if(
                !oldComplete
                &&
                newComplete
            ){

                map.set(
                    key,
                    record
                );
            }

        }
    );


    return Array.from(
        map.values()
    );

}


/* =========================================================
   SORT HISTORY OLD -> NEW
========================================================= */

function sortHistory(records){

    records.sort(
        function(a,b){

            const dateA =
                parseDate(
                    a.date
                );


            const dateB =
                parseDate(
                    b.date
                );


            const timeA =
                dateA
                ?
                dateA.getTime()
                :
                0;


            const timeB =
                dateB
                ?
                dateB.getTime()
                :
                0;


            return (
                timeA -
                timeB
            );
        }
    );


    return records;

}


/* =========================================================
   FETCH + PARSE ONE HISTORICAL SOURCE
========================================================= */

async function fetchHistoricalSource(
    options
){

    options =
        options || {};


    const safeUrl =
        validateSourceUrl(
            options.url
        );


    const html =
        await fetchHtml(
            safeUrl
        );


    let records =
        parseHistoricalTable(
            html,
            {

                market:
                    cleanText(
                        options.market
                    ),

                source:
                    cleanText(
                        options.source ||
                        "Historical Source"
                    ),

                sourceUrl:
                    safeUrl,

                fromDate:
                    options.fromDate ||
                    defaultHistoryFrom(),

                toDate:
                    options.toDate ||
                    defaultHistoryTo()

            }
        );


    records =
        dedupeHistory(
            records
        );


    sortHistory(
        records
    );


    return {

        url:
            safeUrl,

        source:
            cleanText(
                options.source ||
                "Historical Source"
            ),

        market:
            cleanText(
                options.market
            ),

        htmlBytes:
            Buffer.byteLength(
                html,
                "utf8"
            ),

        tableRows:
            extractTableRows(
                html
            )
            .length,

        records

    };

}


/* =========================================================
   PART 2 COMPLETE
========================================================= */

console.log(
    "✅ SERVER PART 2 LOADED"
);


/* =========================================================
   HR MATKA BACKEND
   COMPLETE REPLACEMENT
   PART 3 OF 5

   APIS:
   - SAFE HISTORY RANGE
   - SOURCE TEST
   - PRIMARY-ONLY HISTORY IMPORT
   - READ-ONLY LIVE FETCH
   - STRICT OPEN VALIDATION
========================================================= */


/* =========================================================
   QUERY PARAM HELPER
========================================================= */

function getQueryParams(requestUrl){

    return new URL(
        requestUrl,
        "http://" + HOST + ":" + PORT
    ).searchParams;

}


/* =========================================================
   SAFE HISTORY RANGE

   Minimum:
   01/01/2026

   Maximum:
   Today
========================================================= */

function getSafeHistoryRange(
    fromValue,
    toValue
){

    let fromDate =
        parseApiDate(
            fromValue
        )
        ||
        defaultHistoryFrom();


    let toDate =
        parseApiDate(
            toValue
        )
        ||
        defaultHistoryTo();


    const minimum =
        defaultHistoryFrom();


    const today =
        defaultHistoryTo();


    if(
        startOfDay(
            fromDate
        )
        <
        startOfDay(
            minimum
        )
    ){

        fromDate =
            minimum;
    }


    if(
        startOfDay(
            toDate
        )
        >
        startOfDay(
            today
        )
    ){

        toDate =
            today;
    }


    if(
        startOfDay(
            fromDate
        )
        >
        startOfDay(
            toDate
        )
    ){

        throw new Error(
            "Invalid History Date Range"
        );
    }


    return {

        fromDate,
        toDate

    };

}


/* =========================================================
   HEALTH CHECK
========================================================= */

async function handleHealth(
    req,
    res
){

    sendJson(
        res,
        200,
        {

            ok:
                true,

            project:
                "HR MATKA",

            backend:
                "Connected",

            mode:
                "PRIMARY_HISTORY_ONLY",

            historicalImport:
                true,

            liveProxy:
                true,

            strictOpenRule:
                true,

            historicalSettlement:
                false,

            serverTime:
                new Date()
                .toISOString()

        }
    );

}


/* =========================================================
   SOURCE TEST

   GET:
   /api/source/test?url=https://...
========================================================= */

async function handleSourceTest(
    req,
    res
){

    try{

        const params =
            getQueryParams(
                req.url
            );


        const requestedUrl =
            params.get(
                "url"
            );


        const safeUrl =
            validateSourceUrl(
                requestedUrl
            );


        const html =
            await fetchHtml(
                safeUrl
            );


        const rows =
            extractTableRows(
                html
            );


        sendJson(
            res,
            200,
            {

                ok:
                    true,

                status:
                    "Working",

                sourceUrl:
                    safeUrl,

                title:
                    getPageTitle(
                        html
                    ),

                bytes:
                    Buffer.byteLength(
                        html,
                        "utf8"
                    ),

                tableRowCount:
                    rows.length,

                tableRowsSample:
                    rows.slice(
                        0,
                        3
                    )

            }
        );

    }
    catch(error){

        sendJson(
            res,
            500,
            {

                ok:
                    false,

                status:
                    "Error",

                message:
                    String(
                        error.message
                        ||
                        error
                    )

            }
        );

    }

}


/* =========================================================
   PRIMARY-ONLY HISTORICAL IMPORT

   POST:
   /api/history/import

   BODY:
   {
       "market":"SRIDEVI",
       "url":"https://dpbossss.boston/...",
       "source":"DPBOSS",
       "from":"2026-01-01",
       "to":"2026-08-18"
   }

   IMPORTANT:
   - Historical chart only
   - Wallet/bet settlement disabled
========================================================= */

async function handleHistoryImport(
    req,
    res
){

    try{

        const body =
            await readJsonBody(
                req
            );


        const market =
            cleanText(
                body.market
            );


        if(
            !market
        ){

            throw new Error(
                "Market Required"
            );
        }


        const requestedUrl =
            normalizeSourceUrl(
                body.url
            );


        if(
            !requestedUrl
        ){

            throw new Error(
                "Historical Source URL Required"
            );
        }


        const source =
            cleanText(
                body.source
                ||
                "DPBOSS"
            );


        const range =
            getSafeHistoryRange(
                body.from,
                body.to
            );


        const result =
            await fetchHistoricalSource(
                {

                    url:
                        requestedUrl,

                    source:
                        source,

                    market:
                        market,

                    fromDate:
                        range.fromDate,

                    toDate:
                        range.toDate

                }
            );


        sendJson(
            res,
            200,
            {

                ok:
                    true,

                market:
                    market,

                source:
                    result.source,

                sourceUrl:
                    result.url,

                from:
                    formatDate(
                        range.fromDate
                    ),

                to:
                    formatDate(
                        range.toDate
                    ),

                htmlBytes:
                    result.htmlBytes,

                tableRows:
                    result.tableRows,

                total:
                    result.records.length,

                records:
                    result.records

            }
        );

    }
    catch(error){

        sendJson(
            res,
            500,
            {

                ok:
                    false,

                message:
                    String(
                        error.message
                        ||
                        error
                    ),

                total:
                    0,

                records:
                    []

            }
        );

    }

}


/* =========================================================
   READ-ONLY LIVE FETCH

   POST:
   /api/live/fetch

   BODY:
   {
       "url":"https://..."
   }
========================================================= */

async function handleLiveFetch(
    req,
    res
){

    try{

        const body =
            await readJsonBody(
                req
            );


        const requestedUrl =
            normalizeSourceUrl(
                body.url
            );


        if(
            !requestedUrl
        ){

            throw new Error(
                "Source URL Required"
            );
        }


        const safeUrl =
            validateSourceUrl(
                requestedUrl
            );


        const html =
            await fetchHtml(
                safeUrl
            );


        sendJson(
            res,
            200,
            {

                ok:
                    true,

                sourceUrl:
                    safeUrl,

                title:
                    getPageTitle(
                        html
                    ),

                bytes:
                    Buffer.byteLength(
                        html,
                        "utf8"
                    ),

                html:
                    html

            }
        );

    }
    catch(error){

        sendJson(
            res,
            500,
            {

                ok:
                    false,

                message:
                    String(
                        error.message
                        ||
                        error
                    )

            }
        );

    }

}


/* =========================================================
   STRICT OPEN VALIDATION

   RULE:
   During OPEN phase:
   JODI or CLOSE present => full candidate reject
========================================================= */

function validateStrictOpenResult(candidate){

    candidate =
        candidate || {};


    const openPanel =
        normalizePanel(
            candidate.openPanel
        );


    const sourceOpenSingle =
        cleanText(
            candidate.openSingle
        );


    const sourceJodi =
        normalizeJodi(
            candidate.jodi
        );


    const sourceClosePanel =
        normalizePanel(
            candidate.closePanel
        );


    if(
        !validPanel(
            openPanel
        )
    ){

        return {

            ok:
                false,

            reason:
                "INVALID_OPEN_PANEL"

        };
    }


    if(
        validJodi(
            sourceJodi
        )
        ||
        validPanel(
            sourceClosePanel
        )
    ){

        return {

            ok:
                false,

            reason:
                "FULL_RESULT_DURING_OPEN_REJECTED"

        };
    }


    const calculatedSingle =
        calculateSingle(
            openPanel
        );


    if(
        sourceOpenSingle
        &&
        (
            !validSingle(
                sourceOpenSingle
            )
            ||
            sourceOpenSingle
            !==
            calculatedSingle
        )
    ){

        return {

            ok:
                false,

            reason:
                "OPEN_SINGLE_MISMATCH"

        };
    }


    return {

        ok:
            true,

        phase:
            "OPEN",

        openPanel:
            openPanel,

        openSingle:
            calculatedSingle

    };

}


/* =========================================================
   STRICT OPEN API

   POST:
   /api/live/validate-open
========================================================= */

async function handleValidateOpen(
    req,
    res
){

    try{

        const body =
            await readJsonBody(
                req
            );


        const validation =
            validateStrictOpenResult(
                {

                    openPanel:
                        body.openPanel,

                    openSingle:
                        body.openSingle,

                    jodi:
                        body.jodi,

                    closePanel:
                        body.closePanel

                }
            );


        sendJson(
            res,
            200,
            {

                ok:
                    validation.ok,

                rejected:
                    !validation.ok,

                reason:
                    validation.reason
                    ||
                    "",

                phase:
                    validation.phase
                    ||
                    "",

                openPanel:
                    validation.openPanel
                    ||
                    "",

                openSingle:
                    validation.openSingle
                    ||
                    ""

            }
        );

    }
    catch(error){

        sendJson(
            res,
            500,
            {

                ok:
                    false,

                rejected:
                    true,

                message:
                    String(
                        error.message
                        ||
                        error
                    )

            }
        );

    }

}


/* =========================================================
   PART 3 COMPLETE
========================================================= */

console.log(
    "✅ SERVER PART 3 LOADED"
);



/* =========================================================
   HR MATKA BACKEND
   COMPLETE REPLACEMENT
   PART 4 OF 5

   ROUTER + CORS
========================================================= */


/* =========================================================
   CORS OPTIONS
========================================================= */

function handleOptions(
    req,
    res
){

    res.writeHead(
        204,
        {

            "Access-Control-Allow-Origin":
                "*",

            "Access-Control-Allow-Methods":
                "GET,POST,OPTIONS",

            "Access-Control-Allow-Headers":
                "Content-Type",

            "Access-Control-Max-Age":
                "86400"

        }
    );


    res.end();

}


/* =========================================================
   MAIN SERVER ROUTER
========================================================= */

const server =
    http.createServer(
        async function(
            req,
            res
        ){

            try{

                /* =========================================
                   CORS PRE-FLIGHT
                ========================================= */

                if(
                    req.method ===
                    "OPTIONS"
                ){

                    handleOptions(
                        req,
                        res
                    );


                    return;
                }


                const parsedUrl =
                    new URL(
                        req.url,
                        "http://" + HOST + ":" + PORT
                    );


                const pathname =
                    parsedUrl.pathname;


                /* =========================================
                   HOME
                ========================================= */

                if(
                    req.method ===
                    "GET"
                    &&
                    pathname ===
                    "/"
                ){

                    sendJson(
                        res,
                        200,
                        {

                            ok:
                                true,

                            project:
                                "HR MATKA",

                            message:
                                "Backend Running",

                            mode:
                                "PRIMARY_HISTORY_ONLY",

                            endpoints:{

                                health:
                                    "/api/health",

                                sourceTest:
                                    "/api/source/test",

                                historyImport:
                                    "/api/history/import",

                                liveFetch:
                                    "/api/live/fetch",

                                validateOpen:
                                    "/api/live/validate-open"

                            }

                        }
                    );


                    return;
                }


                /* =========================================
                   HEALTH
                ========================================= */

                if(
                    req.method ===
                    "GET"
                    &&
                    pathname ===
                    "/api/health"
                ){

                    await handleHealth(
                        req,
                        res
                    );


                    return;
                }


                /* =========================================
                   SOURCE TEST
                ========================================= */

                if(
                    req.method ===
                    "GET"
                    &&
                    pathname ===
                    "/api/source/test"
                ){

                    await handleSourceTest(
                        req,
                        res
                    );


                    return;
                }


                /* =========================================
                   PRIMARY HISTORICAL IMPORT
                ========================================= */

                if(
                    req.method ===
                    "POST"
                    &&
                    pathname ===
                    "/api/history/import"
                ){

                    await handleHistoryImport(
                        req,
                        res
                    );


                    return;
                }


                /* =========================================
                   READ-ONLY LIVE FETCH
                ========================================= */

                if(
                    req.method ===
                    "POST"
                    &&
                    pathname ===
                    "/api/live/fetch"
                ){

                    await handleLiveFetch(
                        req,
                        res
                    );


                    return;
                }


                /* =========================================
                   STRICT OPEN VALIDATION
                ========================================= */

                if(
                    req.method ===
                    "POST"
                    &&
                    pathname ===
                    "/api/live/validate-open"
                ){

                    await handleValidateOpen(
                        req,
                        res
                    );


                    return;
                }


                /* =========================================
                   NOT FOUND
                ========================================= */

                sendJson(
                    res,
                    404,
                    {

                        ok:
                            false,

                        message:
                            "API Route Not Found",

                        pathname:
                            pathname

                    }
                );

            }
            catch(error){

                console.error(
                    "❌ Router Error:",
                    error
                );


                if(
                    !res.headersSent
                ){

                    sendJson(
                        res,
                        500,
                        {

                            ok:
                                false,

                            message:
                                String(
                                    error.message
                                    ||
                                    error
                                )

                        }
                    );

                }
                else{

                    try{

                        res.end();

                    }
                    catch(endError){

                        console.error(
                            "Response End Error:",
                            endError
                        );

                    }

                }

            }

        }
    );


/* =========================================================
   PART 4 COMPLETE
========================================================= */

console.log(
    "✅ SERVER PART 4 LOADED"
);



/* =========================================================
   HR MATKA BACKEND
   COMPLETE REPLACEMENT
   PART 5 OF 5

   SERVER START
   ERROR HANDLING
   FINAL READY STATUS
========================================================= */


/* =========================================================
   SERVER START
========================================================= */

server.listen(
    PORT,
    HOST,
    function(){

        console.log("");
        console.log(
            "============================================"
        );

        console.log(
            "✅ HR MATKA BACKEND RUNNING"
        );

        console.log(
            "✅ Address: http://" +
            HOST +
            ":" +
            PORT
        );

        console.log(
            "✅ Primary-Only Historical Import Ready"
        );

        console.log(
            "✅ Historical Range: January 2026 -> Today"
        );

        console.log(
            "✅ Weekly Historical Chart Parser Ready"
        );

        console.log(
            "✅ Live Source Read Proxy Ready"
        );

        console.log(
            "✅ Strict OPEN Protection Ready"
        );

        console.log(
            "✅ Historical Settlement Disabled"
        );

        console.log(
            "============================================"
        );

        console.log("");

    }
);


/* =========================================================
   SERVER ERROR
========================================================= */

server.on(
    "error",
    function(error){

        if(
            error
            &&
            error.code ===
            "EADDRINUSE"
        ){

            console.error(
                "❌ Port " +
                PORT +
                " already in use."
            );

            console.error(
                "❌ Purana Node server pehle stop karein."
            );

            return;
        }


        console.error(
            "❌ HR MATKA Backend Error:",
            error &&
            (
                error.message ||
                error
            )
        );

    }
);


/* =========================================================
   UNHANDLED PROMISE ERROR
========================================================= */

process.on(
    "unhandledRejection",
    function(error){

        console.error(
            "❌ Unhandled Promise Rejection:",
            error
        );

    }
);


/* =========================================================
   UNCAUGHT ERROR LOGGING
========================================================= */

process.on(
    "uncaughtException",
    function(error){

        console.error(
            "❌ Uncaught Exception:",
            error &&
            (
                error.stack ||
                error.message ||
                error
            )
        );

    }
);


/* =========================================================
   FINAL SERVER STATUS
========================================================= */

console.log(
    "✅ SERVER PART 5 LOADED"
);


/* =========================================================
   SERVER.JS COMPLETE

   PART 1
   +
   PART 2
   +
   PART 3
   +
   PART 4
   +
   PART 5

   = COMPLETE SERVER.JS
========================================================= */
