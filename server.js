require('dotenv').config(); // Load environment variables from .env

const express = require('express');
const { Octokit } = require('@octokit/rest');
const path = require('path');
const cors = require('cors'); // To allow frontend (if separate origin) to talk to backend

const app = express();
const port = process.env.PORT || 3000; // Use port 3000 or environment variable

// Use your GitHub Token if available for higher rate limits
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN, // Or process.env.GITHUB_PAT depending on what you named it
});

// Middleware
app.use(cors()); // Enable CORS for all origins (adjust in production)
app.use(express.json()); // To parse JSON request bodies
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from public directory

// API Endpoint to analyze repo
app.post('/analyze-repo', async (req, res) => {
  const repoUrl = req.body.repoUrl;

  if (!repoUrl) {
    return res.status(400).json({ error: 'GitHub repo URL is required.' });
  }

  // Basic URL parsing - needs more robust error handling for production
  const urlParts = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);

  if (!urlParts || urlParts.length < 3) {
    return res.status(400).json({ error: 'Invalid GitHub repo URL format.' });
  }

  const owner = urlParts[1];
  const repo = urlParts[2];

  try {
    // --- Fetch Repository Info ---
    const repoInfoResponse = await octokit.repos.get({
      owner,
      repo,
    });
    const repoInfo = repoInfoResponse.data;

    // --- Fetch Contributors ---
    const contributorsResponse = await octokit.repos.listContributors({
      owner,
      repo,
      per_page: 10, // Limit to 10 for a simple display
    });
    const contributors = contributorsResponse.data;

    // --- Fetch Commits ---
    const commitsResponse = await octokit.repos.listCommits({
      owner,
      repo,
      per_page: 10, // Limit to 10 for a simple display
    });
    const commits = commitsResponse.data;

    // Structure the response data
    const analysisData = {
      repoInfo: {
        name: repoInfo.full_name,
        description: repoInfo.description,
        stars: repoInfo.stargazers_count,
        forks: repoInfo.forks_count,
        openIssues: repoInfo.open_issues_count,
        language: repoInfo.language,
        createdAt: repoInfo.created_at,
        updatedAt: repoInfo.updated_at,
        url: repoInfo.html_url,
      },
      contributors: contributors.map(c => ({
        login: c.login,
        contributions: c.contributions,
        avatarUrl: c.avatar_url,
        profileUrl: c.html_url,
      })),
      commits: commits.map(c => ({
        sha: c.sha.substring(0, 7), // Short SHA
        message: c.commit.message.split('\n')[0], // First line of commit message
        author: c.commit.author ? c.commit.author.name : 'Unknown',
        date: c.commit.author ? c.commit.author.date : 'Unknown',
        url: c.html_url,
      })),
    };

    res.json(analysisData);

  } catch (error) {
    console.error('GitHub API Error:', error);
    // Handle specific GitHub API errors
    if (error.status === 404) {
      res.status(404).json({ error: `Repository '${owner}/${repo}' not found.` });
    } else if (error.status === 403) {
        // This could be rate limit or forbidden access
        const rateLimitRemaining = error.response?.headers['x-ratelimit-remaining'];
        if (rateLimitRemaining === '0') {
             const resetTime = new Date(error.response.headers['x-ratelimit-reset'] * 1000);
             res.status(403).json({ error: `API rate limit exceeded. Please try again after ${resetTime.toLocaleTimeString()}.` });
        } else {
             res.status(403).json({ error: `Forbidden access to repository. It might be private or require authentication.` });
        }
    }
    else {
      res.status(error.status || 500).json({ error: 'Failed to fetch repository data. Please check the URL and try again.' });
    }
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`Serving frontend from http://localhost:${port}`);
});