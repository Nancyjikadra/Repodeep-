document.addEventListener('DOMContentLoaded', () => {
    const repoUrlInput = document.getElementById('repoUrl');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const loadingDiv = document.getElementById('loading');
    const errorMessageDiv = document.getElementById('errorMessage');
    const resultsDiv = document.getElementById('results');
    const repoInfoDiv = document.getElementById('repoInfo');
    const contributorsDiv = document.getElementById('contributors');
    const commitsDiv = document.getElementById('commits');

    analyzeBtn.addEventListener('click', analyzeRepository);
    repoUrlInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            analyzeRepository();
        }
    });

    async function analyzeRepository() {
        const repoUrl = repoUrlInput.value.trim();

        // Clear previous results and errors
        resultsDiv.classList.add('hidden');
        errorMessageDiv.classList.add('hidden');
        errorMessageDiv.textContent = '';
        loadingDiv.classList.remove('hidden');

        if (!repoUrl) {
            displayError('Please enter a GitHub repository URL.');
            return;
        }

        try {
            const response = await fetch('/analyze-repo', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ repoUrl }),
            });

            const data = await response.json();

            if (!response.ok) {
                // Handle errors from the backend (e.g., invalid URL, repo not found, rate limit)
                displayError(data.error || 'An unknown error occurred.');
                return;
            }

            // Display results
            displayResults(data);

        } catch (error) {
            console.error('Fetch error:', error);
            displayError('An error occurred while communicating with the server.');
        } finally {
            loadingDiv.classList.add('hidden'); // Hide loading indicator
        }
    }

    function displayResults(data) {
        // Display Repo Info
        const info = data.repoInfo;
        repoInfoDiv.innerHTML = `
            <h2>Repository Information</h2>
            <p><strong>Name:</strong> <a href="${info.url}" target="_blank">${info.name}</a></p>
            <p><strong>Description:</strong> ${info.description || 'No description'}</p>
            <p><strong>Stars:</strong> ${info.stars}</p>
            <p><strong>Forks:</strong> ${info.forks}</p>
            <p><strong>Open Issues:</strong> ${info.openIssues}</p>
            <p><strong>Language:</strong> ${info.language || 'N/A'}</p>
            <p><strong>Created:</strong> ${new Date(info.createdAt).toLocaleDateString()}</p>
            <p><strong>Last Updated:</strong> ${new Date(info.updatedAt).toLocaleDateString()}</p>
        `;

        // Display Contributors
        const contributorsList = data.contributors;
        let contributorsHtml = '<h2>Contributors</h2>';
        if (contributorsList.length > 0) {
            contributorsHtml += '<ul>';
            contributorsList.forEach(contributor => {
                contributorsHtml += `
                    <li>
                        <img src="${contributor.avatarUrl}" alt="${contributor.login}" width="20" height="20" style="border-radius: 50%;">
                        <strong><a href="${contributor.profileUrl}" target="_blank">${contributor.login}</a></strong>
                        <span>Contributions: ${contributor.contributions}</span>
                    </li>
                `;
            });
            contributorsHtml += '</ul>';
        } else {
            contributorsHtml += '<p>No contributors found (or API limit reached).</p>';
        }
        contributorsDiv.innerHTML = contributorsHtml;


        // Display Commits
        const commitsList = data.commits;
        let commitsHtml = '<h2>Recent Commits</h2>';
        if (commitsList.length > 0) {
            commitsHtml += '<ul>';
            commitsList.forEach(commit => {
                commitsHtml += `
                    <li>
                        <div>
                            <strong><a href="${commit.url}" target="_blank">${commit.sha}</a></strong>: ${commit.message}
                        </div>
                        <div>
                            by ${commit.author} on ${new Date(commit.date).toLocaleDateString()}
                        </div>
                    </li>
                `;
            });
            commitsHtml += '</ul>';
        } else {
             commitsHtml += '<p>No commits found (or API limit reached).</p>';
        }
        commitsDiv.innerHTML = commitsHtml;


        resultsDiv.classList.remove('hidden'); // Show results section
    }

    function displayError(message) {
        errorMessageDiv.textContent = message;
        errorMessageDiv.classList.remove('hidden');
        resultsDiv.classList.add('hidden'); // Hide results section on error
    }
});
