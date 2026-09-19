import fs from "fs/promises";
import puppeteer from "puppeteer";

function logStep(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
}

const USER_EMAIL = process.env.NAUKRI_EMAIL;
const USER_PASSWORD = process.env.NAUKRI_PASSWORD;

if (!USER_EMAIL || !USER_PASSWORD) {
    logStep("NAUKRI_EMAIL or NAUKRI_PASSWORD is missing.");
    throw new Error("NAUKRI_EMAIL or NAUKRI_PASSWORD is missing.");
}

/**
 * Save screenshot and HTML for debugging.
 */
async function saveDebugFiles(page, name) {
    try {
        await page.screenshot({
            path: `${name}.png`,
            fullPage: true
        });

        const html = await page.content();

        await fs.writeFile(
            `${name}.html`,
            html,
            "utf8"
        );

        logStep(`Debug files saved: ${name}.png and ${name}.html`);
    } catch (error) {
        logStep(`Unable to save debug files: ${error.message}`);
    }
}

/**
 * Wait for an element.
 */
async function waitForElement(page, selector, timeout = 15000) {
    try {
        const element = await page.waitForSelector(selector, {
            visible: true,
            timeout
        });

        return element;
    } catch (error) {
        logStep(`Element not found: ${selector}`);
        return null;
    }
}

/**
 * Wait for an element and click it.
 */
async function waitAndClick(page, selector, timeout = 15000) {
    const element = await waitForElement(
        page,
        selector,
        timeout
    );

    if (!element) {
        return false;
    }

    await element.click();

    return true;
}

/**
 * Main Naukri automation.
 */
async function uploadResume() {

    logStep("Starting Naukri profile automation.");

    let browser;

    try {

        // --------------------------------------------------
        // 1. Launch browser
        // --------------------------------------------------

        logStep("Launching browser.");

        browser = await puppeteer.launch({
            headless: true,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu"
            ]
        });

        logStep("Browser launched.");

        // --------------------------------------------------
        // 2. Create page
        // --------------------------------------------------

        logStep("Creating browser page.");

        const page = await browser.newPage();

        logStep("Browser page created.");

        // Optional but useful for consistent rendering
        await page.setViewport({
            width: 1366,
            height: 768
        });

        // --------------------------------------------------
        // 3. Open Naukri
        // --------------------------------------------------

        logStep("Opening Naukri home page.");

        await page.goto("https://www.naukri.com/", {
            waitUntil: "domcontentloaded",
            timeout: 60000
        });

        logStep(`Naukri home page loaded: ${page.url()}`);

        // --------------------------------------------------
        // 4. Wait for login layer
        // --------------------------------------------------

        logStep("Waiting for the login layer.");

        const loginLayer = await waitForElement(
            page,
            "#login_Layer",
            30000
        );

        if (!loginLayer) {

            logStep(
                "Login layer was not found. Saving debug information."
            );

            await saveDebugFiles(
                page,
                "naukri-login-debug"
            );

            throw new Error(
                "Naukri login layer (#login_Layer) was not found."
            );
        }

        // --------------------------------------------------
        // 5. Open login
        // --------------------------------------------------

        logStep("Opening login layer.");

        await loginLayer.click();

        logStep("Login layer opened.");

        // --------------------------------------------------
        // 6. Email
        // --------------------------------------------------

        const emailSelector =
            'input[placeholder="Enter your active Email ID / Username"]';

        logStep("Waiting for the email field.");

        const emailInput = await waitForElement(
            page,
            emailSelector,
            15000
        );

        if (!emailInput) {

            await saveDebugFiles(
                page,
                "naukri-email-debug"
            );

            throw new Error(
                "Naukri email input was not found."
            );
        }

        await emailInput.type(USER_EMAIL);

        logStep("Email entered.");

        // --------------------------------------------------
        // 7. Password
        // --------------------------------------------------

        const passwordSelector =
            'input[placeholder="Enter your password"]';

        logStep("Waiting for the password field.");

        const passwordInput = await waitForElement(
            page,
            passwordSelector,
            15000
        );

        if (!passwordInput) {

            await saveDebugFiles(
                page,
                "naukri-password-debug"
            );

            throw new Error(
                "Naukri password input was not found."
            );
        }

        await passwordInput.type(USER_PASSWORD);

        logStep("Password entered.");

        // --------------------------------------------------
        // 8. Login
        // --------------------------------------------------

        const loginButtonSelector =
            "button.loginButton";

        logStep("Waiting for the login button.");

        const loginButton = await waitForElement(
            page,
            loginButtonSelector,
            15000
        );

        if (!loginButton) {

            await saveDebugFiles(
                page,
                "naukri-login-button-debug"
            );

            throw new Error(
                "Naukri login button was not found."
            );
        }

        logStep("Submitting login.");

        await Promise.all([
            loginButton.click(),

            page.waitForNavigation({
                waitUntil: "networkidle2",
                timeout: 30000
            }).catch(() => {
                logStep(
                    "Login did not trigger full page navigation."
                );
            })
        ]);

        logStep(
            `Login submitted. Current URL: ${page.url()}`
        );

        // --------------------------------------------------
        // 9. Wait after login
        // --------------------------------------------------

        logStep("Waiting for login processing.");

        await new Promise(resolve =>
            setTimeout(resolve, 3000)
        );

        // --------------------------------------------------
        // 10. Open profile directly
        // --------------------------------------------------

        logStep("Opening Naukri profile page.");

        await page.goto(
            "https://www.naukri.com/mnjuser/profile",
            {
                waitUntil: "networkidle2",
                timeout: 60000
            }
        );

        logStep(
            `Profile page loaded: ${page.url()}`
        );

        // --------------------------------------------------
        // 11. Resume headline edit button
        // --------------------------------------------------

        const resumeEditSelector =
            "#lazyResumeHead .edit.icon";

        logStep(
            "Waiting for resume headline edit control."
        );

        const resumeEditButton = await waitForElement(
            page,
            resumeEditSelector,
            20000
        );

        if (!resumeEditButton) {

            await saveDebugFiles(
                page,
                "naukri-profile-debug"
            );

            throw new Error(
                "Resume headline edit control was not found."
            );
        }

        logStep(
            "Opening resume headline editor."
        );

        await resumeEditButton.click();

        logStep(
            "Resume headline editor opened."
        );

        // --------------------------------------------------
        // 12. Resume headline save button
        // --------------------------------------------------

        const saveHeadlineSelector =
            "form[name='resumeHeadlineForm'] button[type='submit']";

        logStep(
            "Waiting for resume headline save button."
        );

        const saveHeadlineButton = await waitForElement(
            page,
            saveHeadlineSelector,
            15000
        );

        if (!saveHeadlineButton) {

            await saveDebugFiles(
                page,
                "naukri-headline-editor-debug"
            );

            throw new Error(
                "Resume headline save button was not found."
            );
        }

        // --------------------------------------------------
        // 13. Give editor time to finish loading
        // --------------------------------------------------

        logStep(
            "Waiting for the editor to finish loading."
        );

        await new Promise(resolve =>
            setTimeout(resolve, 10000)
        );

        // --------------------------------------------------
        // 14. Save resume headline
        // --------------------------------------------------

        logStep("Saving resume headline.");

        await saveHeadlineButton.click();

        logStep(
            "Resume headline save submitted."
        );

        // --------------------------------------------------
        // 15. Wait for profile update popup
        // --------------------------------------------------

        logStep(
            "Waiting for profile update popup."
        );

        const popupCloseSelector =
            "div.profileEditDrawer.profileUpdatedProLayer .crossLayer .icon";

        const popupCloseButton = await waitForElement(
            page,
            popupCloseSelector,
            10000
        );

        if (popupCloseButton) {

            logStep(
                "Profile update popup found."
            );

            await popupCloseButton.click();

            logStep(
                "Profile update popup closed."
            );

        } else {

            logStep(
                "Profile update popup was not found. Continuing."
            );
        }

        // --------------------------------------------------
        // 16. Profile menu
        // --------------------------------------------------

        logStep(
            `Profile update flow completed. Current URL: ${page.url()}`
        );

        await new Promise(resolve =>
            setTimeout(resolve, 3000)
        );

        const profileMenuSelector =
            "button[aria-label='Open profile menu']";

        logStep(
            "Waiting for profile menu button."
        );

        const profileMenuButton = await waitForElement(
            page,
            profileMenuSelector,
            15000
        );

        if (!profileMenuButton) {

            await saveDebugFiles(
                page,
                "naukri-profile-menu-debug"
            );

            throw new Error(
                "Profile menu button was not found."
            );
        }

        logStep(
            "Opening profile menu."
        );

        await profileMenuButton.click();

        logStep(
            "Profile menu opened."
        );

        // --------------------------------------------------
        // 17. Logout
        // --------------------------------------------------

        await new Promise(resolve =>
            setTimeout(resolve, 2000)
        );

        const logoutSelector =
            "a[data-type='logoutLink']";

        logStep(
            "Waiting for logout link."
        );

        const logoutLink = await waitForElement(
            page,
            logoutSelector,
            15000
        );

        if (!logoutLink) {

            await saveDebugFiles(
                page,
                "naukri-logout-debug"
            );

            throw new Error(
                "Logout link was not found."
            );
        }

        logStep(
            "Logging out."
        );

        await logoutLink.click();

        logStep(
            "Logout completed."
        );

        await new Promise(resolve =>
            setTimeout(resolve, 3000)
        );

        logStep(
            "Naukri automation completed successfully."
        );

    } catch (error) {

        logStep(
            "Workflow failed with an error."
        );

        console.error(error);

        // Try to save a final debug screenshot
        // before closing the browser.
        if (browser) {

            try {

                const pages = await browser.pages();

                if (pages.length > 0) {

                    await saveDebugFiles(
                        pages[0],
                        "naukri-error-debug"
                    );
                }

            } catch (debugError) {

                logStep(
                    `Unable to save final debug files: ${debugError.message}`
                );
            }
        }

        // Re-throw so GitHub Actions marks
        // the workflow as failed.
        throw error;

    } finally {

        if (browser) {

            await browser.close();

            logStep(
                "Browser closed."
            );
        }
    }
}

uploadResume();