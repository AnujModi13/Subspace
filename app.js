const express = require('express');
const axios = require('axios');
const lodash = require('lodash');

const app = express();
const PORT = 3000;

let blogs; // Variable to store fetched blogs
let analyticsData = {}; // Object to store analytics data

// Fetch data from the third-party API when the server starts
async function fetchData() {
  try {
    const response = await axios.get('https://intent-kit-16.hasura.app/api/rest/blogs', {
      headers: {
        'x-hasura-admin-secret': '32qR4KmXOIpsGPQKMqEJHGJS27G5s7HdSKO3gdtQd2kv5e852SiYwWNfxkZOBuQ6'
      }
    });
    blogs = response.data;

    // Calculate analytics data
    analyticsData.totalBlogs = blogs.blogs.length;
    analyticsData.longestTitleBlog = lodash.maxBy(blogs.blogs, 'title.length').title;
    analyticsData.privacyTitleCount = lodash.filter(blogs.blogs, blog => lodash.includes(blog.title.toLowerCase(), 'privacy')).length;
    analyticsData.uniqueTitles = lodash.uniqBy(blogs.blogs, 'title').map(blog => blog.title);
  } catch (error) {
    console.error(error.message);
  }
}

// Middleware to fetch data when the server starts
app.use(async (req, res, next) => {
  if (!blogs) {
    await fetchData();
  }
  next();
});

// Middleware for data retrieval and analysis
app.get('/api/blog-stats', async (req, res) => {
  try {
    if (!blogs) {
      // Fetch data from the third-party API only if not fetched yet
      await fetchData();
    }

    // Respond with the analytics data
    //res.json(analyticsData);
    res.json({

      "Total Number of blogs  ": analyticsData.totalBlogs,
      "Longest Title of the blog  ": analyticsData.longestTitleBlog,
      "Privacy count ": analyticsData.privacyTitleCount,
      "Unique Title ": analyticsData.uniqueTitles
    })
  }
  catch (error) {
    console.error(error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Blog search endpoint with POST method
app.post('/api/blog-search', express.json(), (req, res) => {
  const query = req.body; // Extract the query from the request body
  const lowerQuery = lodash.mapValues(query, (value) => lodash.toLower(value));
  if (!query) {
    return res.status(400).json({ error: 'Query parameter is missing' });
  }

  // Check if 'blogs' is defined before performing search
  if (!blogs) {
    console.error('Blogs data not available');
    return res.status(500).json({ error: 'Blogs data not available' });
  }

  // Perform a case-insensitive search on the fetched blogs' titles
  const searchResults = blogs.blogs.filter((blog) =>
    blog.title.toLowerCase().includes(lowerQuery.title)
  );

  console.log(searchResults);

  // Send the search results in the response
  res.json({ results: searchResults });
});


// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
