import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  Grid,
  Chip,
  Card,
  CardContent,
  Divider,
  Alert,
  LinearProgress,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  FormControlLabel,
  Switch,
  Badge
} from '@mui/material';
import {
  Search as SearchIcon,
  ContentCopy as ContentCopyIcon,
  CheckCircle as CheckCircleIcon,
  Summarize as SummarizeIcon,
  FilterList as DeduplicateIcon,
  Token as TokenIcon
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE = 'http://localhost:8787';

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index} style={{ paddingTop: 16 }}>
      {value === index && children}
    </div>
  );
}

function SummarizationDedup() {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [dedupResults, setDedupResults] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dedupLoading, setDedupLoading] = useState(false);
  const [summarizeLoading, setSummarizeLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [copiedItems, setCopiedItems] = useState(new Set());
  
  const [searchType, setSearchType] = useState('vector');
  const [limit, setLimit] = useState(20);
  const [dedupThreshold, setDedupThreshold] = useState(0.85);
  const [summaryType, setSummaryType] = useState('concise');
  const [showDuplicates, setShowDuplicates] = useState(true);

  const handleSearch = async () => {
    if (!query.trim()) {
      setError('Please enter a query');
      return;
    }

    setLoading(true);
    setError(null);
    setSearchResults(null);
    setDedupResults(null);
    setSummary(null);

    try {
      const endpoint = searchType === 'vector' 
        ? `${API_BASE}/search/stories`
        : searchType === 'bm25'
        ? `${API_BASE}/api/search/bm25`
        : `${API_BASE}/api/search/hybrid`;

      const requestBody = searchType === 'vector'
        ? { newUserStory: query, topK: limit }
        : { query, limit };

      const response = await axios.post(endpoint, requestBody);

      const results = searchType === 'vector'
        ? response.data.relatedStories || []
        : response.data.results || [];

      setSearchResults({ results });
      setTabValue(0);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeduplicate = async () => {
    if (!searchResults?.results) {
      setError('Please search first');
      return;
    }

    setDedupLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_BASE}/api/search/deduplicate`, {
        results: searchResults.results,
        threshold: dedupThreshold
      });

      setDedupResults(response.data);
      setTabValue(1);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setDedupLoading(false);
    }
  };

  const handleSummarize = async () => {
    const resultsToSummarize = dedupResults?.deduplicated || searchResults?.results;
    if (!resultsToSummarize || resultsToSummarize.length === 0) {
      setError('Please search and optionally deduplicate first');
      return;
    }

    setSummarizeLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_BASE}/api/search/summarize`, {
        results: resultsToSummarize,
        summaryType
      });

      setSummary(response.data);
      setTabValue(2);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSummarizeLoading(false);
    }
  };

  const handleCopy = (text, itemId) => {
    navigator.clipboard.writeText(text);
    setCopiedItems(new Set([...copiedItems, itemId]));
    setTimeout(() => {
      const newSet = new Set(copiedItems);
      newSet.delete(itemId);
      setCopiedItems(newSet);
    }, 2000);
  };

  return (
    <Box sx={{ maxWidth: 1400, margin: 'auto', padding: 3 }}>
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <SummarizeIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            Summarization & Deduplication
          </Typography>
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Search for user stories, remove duplicates, and generate AI-powered summaries.
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              label="Search Query"
              variant="outlined"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., user registration, account creation..."
              disabled={loading}
            />
          </Grid>

          <Grid item xs={6} md={2}>
            <TextField
              fullWidth
              label="Results Limit"
              type="number"
              variant="outlined"
              value={limit}
              onChange={(e) => setLimit(Math.max(1, Math.min(100, parseInt(e.target.value) || 20)))}
              disabled={loading}
            />
          </Grid>

          <Grid item xs={6} md={2}>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              startIcon={loading ? <LinearProgress /> : <SearchIcon />}
              sx={{ height: '56px' }}
            >
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </Grid>
        </Grid>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Paper>

      {searchResults && (
        <Box>
          <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 2 }}>
            <Tab label={`Search Results (${searchResults.results?.length || 0})`} />
            <Tab 
              label={
                <Badge badgeContent={dedupResults?.stats?.duplicatesRemoved || 0} color="error">
                  Deduplication
                </Badge>
              } 
            />
            <Tab label="Summary" />
          </Tabs>

          <TabPanel value={tabValue} index={0}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Search Results ({searchResults.results?.length || 0})
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={<DeduplicateIcon />}
                    onClick={handleDeduplicate}
                    disabled={dedupLoading || !searchResults.results}
                  >
                    {dedupLoading ? 'Deduplicating...' : 'Deduplicate'}
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<SummarizeIcon />}
                    onClick={handleSummarize}
                    disabled={summarizeLoading || !searchResults.results}
                  >
                    {summarizeLoading ? 'Summarizing...' : 'Summarize'}
                  </Button>
                </Box>
                {searchResults.results?.map((result, idx) => (
                  <Card key={idx} sx={{ mb: 1 }}>
                    <CardContent>
                      <Typography variant="subtitle1">{result.key || result.storyId}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {result.summary || result.description}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Deduplication Results
                </Typography>
                {dedupResults && (
                  <Box>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      Removed {dedupResults.stats.duplicatesRemoved} duplicates ({dedupResults.stats.reductionPercentage}% reduction)
                    </Alert>
                    <Typography variant="subtitle2" gutterBottom>
                      Deduplicated Stories ({dedupResults.deduplicated.length})
                    </Typography>
                    {dedupResults.deduplicated.map((result, idx) => (
                      <Card key={idx} sx={{ mb: 1 }}>
                        <CardContent>
                          <Typography variant="subtitle1">{result.key || result.storyId}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {result.summary || result.description}
                          </Typography>
                        </CardContent>
                      </Card>
                    ))}
                    {showDuplicates && dedupResults.duplicates.length > 0 && (
                      <>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="subtitle2" gutterBottom>
                          Duplicates Removed ({dedupResults.duplicates.length})
                        </Typography>
                        {dedupResults.duplicates.map((result, idx) => (
                          <Card key={idx} sx={{ mb: 1, bgcolor: 'error.50' }}>
                            <CardContent>
                              <Typography variant="subtitle1">{result.key || result.storyId}</Typography>
                              <Typography variant="body2" color="text.secondary">
                                Duplicate of: {result.duplicateOf} (Similarity: {result.similarity})
                              </Typography>
                            </CardContent>
                          </Card>
                        ))}
                      </>
                    )}
                    <Box sx={{ mt: 2 }}>
                      <Button
                        variant="outlined"
                        startIcon={<SummarizeIcon />}
                        onClick={handleSummarize}
                        disabled={summarizeLoading}
                      >
                        {summarizeLoading ? 'Summarizing...' : 'Summarize Deduplicated Results'}
                      </Button>
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  AI Summary
                </Typography>
                {summary && (
                  <Box>
                    <Paper sx={{ p: 2, bgcolor: 'primary.50', mb: 2 }}>
                      <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                        {summary.summary}
                      </Typography>
                    </Paper>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton
                        onClick={() => handleCopy(summary.summary, 'summary')}
                        color={copiedItems.has('summary') ? 'success' : 'default'}
                      >
                        {copiedItems.has('summary') ? <CheckCircleIcon /> : <ContentCopyIcon />}
                      </IconButton>
                      {summary.tokens && (
                        <Chip
                          icon={<TokenIcon />}
                          label={`${summary.tokens.total} tokens`}
                          size="small"
                        />
                      )}
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          </TabPanel>
        </Box>
      )}
    </Box>
  );
}

export default SummarizationDedup;

