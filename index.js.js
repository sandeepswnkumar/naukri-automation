import puppeteer from "puppeteer";

const USER_EMAIL = process.env.NAUKRI_EMAIL;
const USER_PASSWORD = process.env.NAUKRI_PASSWORD;


if (!USER_EMAIL || !USER_PASSWORD) {
    logStep("NAUKRI_EMAIL or NAUKRI_PASSWORD is missing.")
    throw new Error("NAUKRI_EMAIL or NAUKRI_PASSWORD is missing.");
}

function logStep(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
}

async function uploadResume() {

    logStep("Starting resume upload workflow.");
    let browser;

    try {
        logStep("Launching browser.");
        browser = await puppeteer.launch({
            headless: true,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage"
            ]
        });
        logStep("Browser launched.");

        logStep("Creating browser page.");
        const page = await browser.newPage();
        logStep("Browser page created.");

        logStep("Opening Naukri home page.");
        await page.goto("https://www.naukri.com/", {
            waitUntil: "domcontentloaded",
            timeout: 60000
        });
        logStep(`Naukri home page loaded: ${page.url()}`);

        logStep("Waiting for the login layer.");
        await page.waitForSelector('#login_Layer', { visible: true });
        logStep("Opening the login layer.");
        await page.click('#login_Layer');
        logStep("Login layer opened.");

        const emailSelector = 'input[placeholder="Enter your active Email ID / Username"]';
        logStep("Waiting for the email field.");
        await page.waitForSelector(emailSelector, { visible: true });
        await page.type(emailSelector, USER_EMAIL);
        logStep("Email entered.");

        const passwordSelector = 'input[placeholder="Enter your password"]';
        logStep("Waiting for the password field.");
        await page.waitForSelector(passwordSelector, { visible: true });
        await page.type(passwordSelector, USER_PASSWORD);
        logStep("Password entered.");

        const loginButtonSelector = 'button.loginButton';
        logStep("Waiting for the login button.");
        await page.waitForSelector(loginButtonSelector, { visible: true });
        logStep("Submitting login and waiting for navigation.");
        await Promise.all([
            page.click(loginButtonSelector),
            page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {
                logStep("Login did not trigger a full page navigation; continuing.");
            })
        ]);
        logStep(`Login submitted. Current URL: ${page.url()}`);

        logStep("Checking for the profile page or an OTP/CAPTCHA step.");
        await page.waitForSelector('.view-profile-wrapper, .nudge-container, .resume-upload', { timeout: 15000 }).catch(() => {
            logStep("Profile selector was not found; OTP/CAPTCHA may be present.");
        });

        logStep("Opening the profile page directly.");
        await page.goto("https://www.naukri.com/mnjuser/profile", {
            waitUntil: "networkidle2"
        });
        logStep(`Profile page loaded: ${page.url()}`);

        logStep("Waiting for the resume headline edit control.");
        await page.waitForSelector('#lazyResumeHead .edit.icon', { timeout: 15000 }).catch(() => {
            logStep("Resume headline edit control was not found; OTP/CAPTCHA may be present.");
        });
        logStep("Opening resume headline editor.");
        await page.click('#lazyResumeHead .edit.icon');
        logStep("Resume headline editor opened.");

        logStep("Waiting for the resume headline save button.");
        await page.waitForSelector("form[name='resumeHeadlineForm'] button[type='submit']", { timeout: 15000 }).catch(() => {
            logStep("Resume headline save button was not found; OTP/CAPTCHA may be present.");
        });
        logStep("Waiting for the editor to finish loading.");
        await new Promise(resolve => setTimeout(resolve, 10000));
        logStep("Saving resume headline.");
        await page.click("form[name='resumeHeadlineForm'] button[type='submit']");
        logStep("Resume headline save submitted.");

        logStep("Waiting for the profile update response.");
        await new Promise(resolve => setTimeout(resolve, 5000));
        logStep("Checking for the profile update popup.");
        await page.waitForSelector("div.profileEditDrawer.profileUpdatedProLayer .crossLayer .icon", { timeout: 15000 }).catch(() => {
            logStep("Profile update popup was not found.");
        });

        await page.click("div.profileEditDrawer.profileUpdatedProLayer .crossLayer .icon");

        logStep(`Successfully reached profile page: ${page.url()}`);
        logStep("Waiting for the profile menu button.");
        await new Promise(resolve => setTimeout(resolve, 5000));
        await page.waitForSelector("button[aria-label='Open profile menu']", { timeout: 15000 }).catch(() => {
            logStep("Profile menu button was not found; OTP/CAPTCHA may be present.");
        });
        logStep("Opening profile menu.");
        await page.click("button[aria-label='Open profile menu']");
        logStep("Profile menu opened.");

        logStep("Waiting for the logout link.");
        await new Promise(resolve => setTimeout(resolve, 5000));
        await page.waitForSelector("a[data-type='logoutLink']", { timeout: 15000 }).catch(() => {
            logStep("Logout link was not found.");
        });
        logStep("Logging out.");
        await page.click("a[data-type='logoutLink']");
        logStep("Logout completed.");
        await new Promise(resolve => setTimeout(resolve, 5000));
        logStep("Browser going to close.");
    } catch (error) {
        logStep("Workflow failed with an error.");
        console.error(error);
    } finally {
        // Don't close while developing
        await browser?.close();
        logStep("Workflow finished. Browser closed.");
    }
}

uploadResume();
