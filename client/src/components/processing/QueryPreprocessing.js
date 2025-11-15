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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Search as SearchIcon,
  ContentCopy as ContentCopyIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  Timeline as TimelineIcon,
  Transform as TransformIcon,
  Extension as ExtensionIcon,
  Translate as TranslateIcon
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

function QueryPreprocessing() {
  const [query, setQuery] = useState('As a user, I want to create an account so that I can access the system');
  const [preprocessResult, setPreprocessResult] = useState(null);
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [copiedIndex, setCopiedIndex] = useState(null);
  
  // Options
  const [enableAbbreviations] = useState(true);
  const [enableSynonyms] = useState(true);
  const [maxVariations] = useState(5);
  const [searchType] = useState('vector');

  const handlePreprocess = async () => {
    if (!query.trim()) {
      setError('Please enter a query');
      return;
    }

    setLoading(true);
    setError(null);
    setPreprocessResult(null);
    setSearchResults(null);

    try {
      const response = await axios.post(`${API_BASE}/api/search/preprocess`, {
        query,
        options: {
          enableAbbreviations,
          enableSynonyms,
          maxSynonymVariations: maxVariations
        }
      });

      setPreprocessResult(response.data);
      setTabValue(0);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      console.error('Preprocessing error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (selectedQuery) => {
    setSearchLoading(true);
    setError(null);

    try {
      const endpoint = searchType === 'vector' 
        ? `${API_BASE}/search/stories`
        : searchType === 'bm25'
        ? `${API_BASE}/api/search/bm25`
        : `${API_BASE}/api/search/hybrid`;

      const requestBody = searchType === 'vector'
        ? { newUserStory: selectedQuery || preprocessResult.synonymExpanded[0], topK: 10 }
        : { query: selectedQuery || preprocessResult.synonymExpanded[0], limit: 10 };

      const response = await axios.post(endpoint, requestBody);

      const data = searchType === 'vector' 
        ? { results: response.data.relatedStories || [] }
        : response.data;

      setSearchResults(data);
      setTabValue(3);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      console.error('Search error:', err);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <Box sx={{ maxWidth: 1400, margin: 'auto', padding: 3 }}>
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <TransformIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            Query Preprocessing
          </Typography>
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Transform and expand your search queries with normalization, abbreviation expansion, and synonym expansion.
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Enter User Story Query"
              variant="outlined"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              multiline
              rows={3}
              placeholder="e.g., As a user, I want to create an account so that I can access the system"
              disabled={loading}
            />
          </Grid>

          <Grid item xs={12}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={handlePreprocess}
              disabled={loading || !query.trim()}
              startIcon={loading ? <LinearProgress /> : <TransformIcon />}
              fullWidth
            >
              {loading ? 'Preprocessing...' : 'Preprocess Query'}
            </Button>
          </Grid>
        </Grid>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Paper>

      {preprocessResult && (
        <Box>
          <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 2 }}>
            <Tab label="Preprocessing Results" />
            <Tab label="Abbreviations" />
            <Tab label="Synonyms" />
            <Tab label="Search with Preprocessed" />
          </Tabs>

          <TabPanel value={tabValue} index={0}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Preprocessing Pipeline
                </Typography>
                <Divider sx={{ my: 2 }} />
                
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">Original Query</Typography>
                    <Paper sx={{ p: 2, bgcolor: 'grey.100', mt: 1 }}>
                      <Typography variant="body2">{preprocessResult.original}</Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">Normalized</Typography>
                    <Paper sx={{ p: 2, bgcolor: 'primary.50', mt: 1 }}>
                      <Typography variant="body2">{preprocessResult.normalized}</Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">Abbreviation Expanded</Typography>
                    <Paper sx={{ p: 2, bgcolor: 'secondary.50', mt: 1 }}>
                      <Typography variant="body2">{preprocessResult.abbreviationExpanded}</Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Synonym Expanded Variations ({preprocessResult.synonymExpanded?.length || 0})
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {preprocessResult.synonymExpanded?.map((variation, idx) => (
                        <Paper key={idx} sx={{ p: 2, bgcolor: 'info.50', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" sx={{ flex: 1 }}>{variation}</Typography>
                          <Box>
                            <IconButton
                              size="small"
                              onClick={() => handleCopy(variation, idx)}
                              color={copiedIndex === idx ? 'success' : 'default'}
                            >
                              {copiedIndex === idx ? <CheckCircleIcon /> : <ContentCopyIcon />}
                            </IconButton>
                            <Button
                              size="small"
                              onClick={() => handleSearch(variation)}
                              disabled={searchLoading}
                            >
                              Search
                            </Button>
                          </Box>
                        </Paper>
                      ))}
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Abbreviation Mappings
                </Typography>
                {preprocessResult.metadata?.abbreviationMappings?.length > 0 ? (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Abbreviation</TableCell>
                          <TableCell>Expansion</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {preprocessResult.metadata.abbreviationMappings.map((mapping, idx) => (
                          <TableRow key={idx}>
                            <TableCell><Chip label={mapping.abbreviation} size="small" /></TableCell>
                            <TableCell>{mapping.expansion}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Alert severity="info">No abbreviations found in query</Alert>
                )}
              </CardContent>
            </Card>
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Synonym Mappings
                </Typography>
                {preprocessResult.metadata?.synonymMappings?.length > 0 ? (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Term</TableCell>
                          <TableCell>Synonyms</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {preprocessResult.metadata.synonymMappings.map((mapping, idx) => (
                          <TableRow key={idx}>
                            <TableCell><Chip label={mapping.term} size="small" /></TableCell>
                            <TableCell>
                              {mapping.synonyms.map((syn, i) => (
                                <Chip key={i} label={syn} size="small" variant="outlined" sx={{ mr: 0.5, mb: 0.5 }} />
                              ))}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Alert severity="info">No synonyms found in query</Alert>
                )}
              </CardContent>
            </Card>
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Search Results with Preprocessed Query
                </Typography>
                {searchLoading ? (
                  <LinearProgress />
                ) : searchResults ? (
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Found {searchResults.results?.length || 0} results
                    </Typography>
                    {searchResults.results?.slice(0, 5).map((result, idx) => (
                      <Card key={idx} sx={{ mb: 1, mt: 1 }}>
                        <CardContent>
                          <Typography variant="subtitle1">{result.key || result.storyId}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {result.summary || result.description}
                          </Typography>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                ) : (
                  <Alert severity="info">Click "Search" on any variation to see results</Alert>
                )}
              </CardContent>
            </Card>
          </TabPanel>
        </Box>
      )}
    </Box>
  );
}

export default QueryPreprocessing;

