const Apify = require('apify');

const sourceUrl = 'https://ncovtracker.doh.gov.ph/';
const LATEST = 'LATEST';
let check = false;

Apify.main(async () =>
{

    const kvStore = await Apify.openKeyValueStore('COVID-19-PH');
    const dataset = await Apify.openDataset('COVID-19-PH-HISTORY');
    const { email } = await Apify.getValue('INPUT');

    try{


    console.log('Launching Puppeteer...');
    const browser = await Apify.launchPuppeteer();

    const page = await browser.newPage();
   
    console.log('Going to the website...');
    
    // the source url (html page source) link to this page
    await page.goto('https://www.doh.gov.ph/2019-nCoV', { timeout: 60000 });
    await Apify.utils.puppeteer.injectJQuery(page);
    
    //await await page.waitForSelector("text[vector-effect='non-scaling-stroke']", { timeout: 60000 });
    await page.waitFor(10000);
    
    console.log('Getting data...');
    // page.evaluate(pageFunction[, ...args]), pageFunction <function|string> Function to be evaluated in the page context, returns: <Promise<Serializable>> Promise which resolves to the return value of pageFunction
    const result = await page.evaluate(() =>
    {
        
        const getInt = (x)=>{
            return parseInt(x.replace(' ','').replace(',',''))};
        
        const now = new Date();
        
        // eq() selector selects an element with a specific index number, text() method sets or returns the text content of the selected elements
        //const confirmed = $('text:contains(Confirmed)').closest('full-container').find("text[vector-effect='non-scaling-stroke']").eq(1).text().trim();
        const confirmed = $('#block-block-17 > div > table > tbody > tr:nth-child(1) > td:nth-child(2) > p > font > b').text().trim();
        //const PUIs = $("text[vector-effect='non-scaling-stroke']").eq(3).text();
        //const PUMs = $("text[vector-effect='non-scaling-stroke']").eq(5).text();
        //const recovered = $('text:contains(Recovered)').closest('full-container').find('.responsive-text').eq(1).text().trim();
        const recovered = $('#block-block-17 > div > table > tbody > tr:nth-child(2) > td:nth-child(2) > p > font > b').text().trim();
        //const deceased = $('text:contains(Deaths)').closest('full-container').find('.responsive-text').eq(1).text().trim();
        const deceased = $('#block-block-17 > div > table > tbody > tr:nth-child(3) > td:nth-child(2) > p > strong').text().trim();
        //const PUIsTested = $("text[vector-effect='non-scaling-stroke']").eq(10).text();
                     
        const data = {
            infected: getInt(confirmed),
            tested: "N/A",
            recovered: getInt(recovered),
            deceased: getInt(deceased),
            //PUIs: getInt(PUIs),
            //PUMs: getInt(PUMs),
            country: "Philippines",
            historyData: "https://api.apify.com/v2/datasets/sFSef5gfYg3soj8mb/items?format=json&clean=1",
            sourceUrl:'https://ncovtracker.doh.gov.ph/',
            lastUpdatedAtApify: new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes())).toISOString(),
            lastUpdatedAtSource: "N/A",
            readMe: 'https://apify.com/katerinahronik/covid-philippines',
            };
        return data;
        
    });       
    
    console.log(result)
    
    if ( !result.infected || !result.deceased|| !result.recovered) {
                check = true;
            }
    else {
            let latest = await kvStore.getValue(LATEST);
            if (!latest) {
                await kvStore.setValue('LATEST', result);
                latest = result;
            }
            delete latest.lastUpdatedAtApify;
            const actual = Object.assign({}, result);
            delete actual.lastUpdatedAtApify;

            if (JSON.stringify(latest) !== JSON.stringify(actual)) {
                await dataset.pushData(result);
            }

           await kvStore.setValue('LATEST', result);
           await Apify.pushData(result);
         }


    console.log('Closing Puppeteer...');
    await browser.close();
    console.log('Done.');  
    
    // if there are no data for TotalInfected, send email, because that means something is wrong
    // const env = await Apify.getEnv();
    //   if (check) {
    //     await Apify.call(
    //         'apify/send-mail',
    //         {
    //             to: email,
    //             subject: `Covid-19 Philippines from ${env.startedAt} failed `,
    //             html: `Hi, ${'<br/>'}
    //                     <a href="https://my.apify.com/actors/${env.actorId}#/runs/${env.actorRunId}">this</a> 
    //                     run had 0 in one of the variables, check it out.`,
    //         },
    //         { waitSecs: 0 },
    //     );
    // };
}
catch(err){

    console.log(err)

    let latest = await kvStore.getValue(LATEST);
    var latestKvs = latest.lastUpdatedAtApify;
    var latestKvsDate = new Date(latestKvs)
    var d = new Date();
    // adding two hours to d
    d.setHours(d.getHours() - 2);
    if (latestKvsDate < d) {
        throw (err)
    }
}
});
