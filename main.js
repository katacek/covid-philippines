const Apify = require('apify');

const sourceUrl = 'https://ncovtracker.doh.gov.ph/';
const LATEST = 'LATEST';
let check = false;

Apify.main(async () =>
{

    const kvStore = await Apify.openKeyValueStore('COVID-19-PH');
    const dataset = await Apify.openDataset('COVID-19-PH-HISTORY');
    const { email } = await Apify.getValue('INPUT');

    console.log('Launching Puppeteer...');
    const browser = await Apify.launchPuppeteer();

    const page = await browser.newPage();
   
    console.log('Going to the website...');
    
    // the source url (html page source) is just a link to this page
    await page.goto('https://dohph.maps.arcgis.com/apps/opsdashboard/index.html#/3dda5e52a7244f12a4fb3d697e32fd39', { waitUntil: 'networkidle0', timeout: 60000 });
    await Apify.utils.puppeteer.injectJQuery(page);
    
    await page.waitForSelector("text[vector-effect='non-scaling-stroke']");
    await page.waitFor(60000);
    
    console.log('Getting data...');
    // page.evaluate(pageFunction[, ...args]), pageFunction <function|string> Function to be evaluated in the page context, returns: <Promise<Serializable>> Promise which resolves to the return value of pageFunction
    const result = await page.evaluate(() =>
    {
        
        const getInt = (x)=>{
            return parseInt(x.replace(' ','').replace(',',''))};
        
        const now = new Date();
        
        // eq() selector selects an element with a specific index number, text() method sets or returns the text content of the selected elements
        const confirmed = $("text[vector-effect='non-scaling-stroke']").eq(1).text();
        const PUIs = $("text[vector-effect='non-scaling-stroke']").eq(3).text();
        //const PUMs = $("text[vector-effect='non-scaling-stroke']").eq(5).text();
        const recovered = $("text[vector-effect='non-scaling-stroke']").eq(5).text();
        const deceased = $("text[vector-effect='non-scaling-stroke']").eq(7).text();
        const PUIsTested = $("text[vector-effect='non-scaling-stroke']").eq(10).text();
                     
        const data = {
            infected: getInt(confirmed),
            tested: getInt(PUIsTested),
            recovered: getInt(recovered),
            deceased: getInt(deceased),
            PUIs: getInt(PUIs),
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
    const env = await Apify.getEnv();
      if (check) {
        await Apify.call(
            'apify/send-mail',
            {
                to: email,
                subject: `Covid-19 Philippines from ${env.startedAt} failed `,
                html: `Hi, ${'<br/>'}
                        <a href="https://my.apify.com/actors/${env.actorId}#/runs/${env.actorRunId}">this</a> 
                        run had 0 in one of the variables, check it out.`,
            },
            { waitSecs: 0 },
        );
    };
});
