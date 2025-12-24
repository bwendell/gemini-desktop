const { execSync } = require('child_process');

/**
 * Signs the Windows binary using Azure Trusted Signing via the Azure CLI.
 * 
 * Required Environment Variables:
 * - AZURE_ACCOUNT_NAME: The name of the Trusted Signing Account.
 * - AZURE_CERT_PROFILE_NAME: The name of the Certificate Profile.
 * - AZURE_ENDPOINT: The Trusted Signing Endpoint (e.g., https://eus.codesigning.azure.net/).
 * 
 * Note: The environment must be authenticated with Azure CLI (`az login`).
 */
exports.default = async function (configuration) {
    // If no files to sign, skip
    if (!configuration.path) {
        console.log('No file path provided for signing.');
        return;
    }

    const accountName = process.env.AZURE_ACCOUNT_NAME;
    const certProfileName = process.env.AZURE_CERT_PROFILE_NAME;
    const endpoint = process.env.AZURE_ENDPOINT;

    // Skip signing if environment variables are not set (e.g. dev builds)
    if (!accountName || !certProfileName || !endpoint) {
        console.warn('Skipping signing: Azure Trusted Signing environment variables are missing.');
        console.warn('Required: AZURE_ACCOUNT_NAME, AZURE_CERT_PROFILE_NAME, AZURE_ENDPOINT');
        return;
    }

    console.log(`Signing ${configuration.path} using Azure Trusted Signing...`);

    try {
        // Construct the az trusted-signing sign command
        // --file: Path to the file to be signed
        // --account-name: Trusted Signing Account Name
        // --certificate-profile-name: Certificate Profile Name
        // --endpoint: Trusted Signing Endpoint
        // --overwrite: Overwrite the existing file with the signed one
        const command = `az trusted-signing sign --file "${configuration.path}" --account-name "${accountName}" --certificate-profile-name "${certProfileName}" --endpoint "${endpoint}" --overwrite`;

        // Execute the command synchronously
        execSync(command, { stdio: 'inherit' });
        console.log('Successfully signed ' + configuration.path);
    } catch (error) {
        console.error('Failed to sign ' + configuration.path);
        console.error(error);
        throw error; // Fail the build if signing fails
    }
};
