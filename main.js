const Apify = require('apify');

const sourceUrl = 'https://ncovtracker.doh.gov.ph/';
const LATEST = 'LATEST';
let check = false;

Apify.main(async () =>
{

    //const kvStore = await Apify.openKeyValueStore('COVID-19-PH');
    //const dataset = await Apify.openDataset('COVID-19-PH-HISTORY');
    //const { email } = await Apify.getValue('INPUT');

    console.log('Launching Puppeteer...');
    const browser = await Apify.launchPuppeteer();

    const page = await browser.newPage();
   
    console.log('Going to the website...');
    await page.goto('https://ncovtracker.doh.gov.ph/'), { waitUntil: 'networkidle0', timeout: 60000 };
    await Apify.utils.puppeteer.injectJQuery(page);
    
    //await page.waitForSelector("text[vector-effect='non-scaling-stroke']");
    await page.waitFor(4000);
    //await page.waitForSelector(".esriMapContainer");
 
    console.log('Getting data...');
    // page.evaluate(pageFunction[, ...args]), pageFunction <function|string> Function to be evaluated in the page context, returns: <Promise<Serializable>> Promise which resolves to the return value of pageFunction
    const result = await page.evaluate(() =>
    {

        // eq() selector selects an element with a specific index number, text() method sets or returns the text content of the selected elements
        const confirmed = $("text[vector-effect='non-scaling-stroke']").eq(1).text();
        const PUIs = $("text[vector-effect='non-scaling-stroke']").eq(3).text();
        const PUMs = $("text[vector-effect='non-scaling-stroke']").eq(5).text();
        const recovered = $("text[vector-effect='non-scaling-stroke']").eq(7).text();
        const deceased = $("text[vector-effect='non-scaling-stroke']").eq(9).text();
        const PUIsTested = $("text[vector-effect='non-scaling-stroke']").eq(12).text();
                     
        const data = {
            infected: confirmed,
            tested: PUIsTested,
            recovered: recovered,
            deceased: deceased,
            PUIs: PUIs,
            PUMs: PUMs,
            country: "Phillipines",
            //historyData: "https://api.apify.com/v2/datasets/K1mXdufnpvr53AFk6/items?format=json&clean=1",
            sourceUrl:'https://ncovtracker.doh.gov.ph/',
            //lastUpdatedAtApify: new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes())).toISOString(),
            lastUpdatedAtSource: "N/A",
            // readMe: 'https://apify.com/katerinahronik/covid-uk',
            };
        return data;
        
    });       
    
    console.log(result)
    
    // if ( !result.infected || !result.dailyConfirmed || !result.deceased|| !result.englandConfirmed|| !result.scottlandConfirmed|| !result.walesConfirmed|| !result.northenIrelandConfirmed) {
    //             check = true;
    //         }
    // else {
    //         let latest = await kvStore.getValue(LATEST);
    //         if (!latest) {
    //             await kvStore.setValue('LATEST', result);
    //             latest = result;
    //         }
    //         delete latest.lastUpdatedAtApify;
    //         const actual = Object.assign({}, result);
    //         delete actual.lastUpdatedAtApify;

    //         if (JSON.stringify(latest) !== JSON.stringify(actual)) {
    //             await dataset.pushData(result);
    //         }

    //         await kvStore.setValue('LATEST', result);
    //         await Apify.pushData(result);
    //     }


    console.log('Closing Puppeteer...');
    await browser.close();
    console.log('Done.');  
    
    // if there are no data for TotalInfected, send email, because that means something is wrong
    // const env = await Apify.getEnv();
    // if (check) {
    //     await Apify.call(
    //         'apify/send-mail',
    //         {
    //             to: email,
    //             subject: `Covid-19 UK from ${env.startedAt} failed `,
    //             html: `Hi, ${'<br/>'}
    //                     <a href="https://my.apify.com/actors/${env.actorId}#/runs/${env.actorRunId}">this</a> 
    //                     run had 0 TotalInfected, check it out.`,
    //         },
    //         { waitSecs: 0 },
    //     );
    // };
});
