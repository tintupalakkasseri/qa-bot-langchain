import React, { useState, useCallback } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Chip,
  Alert,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Divider,
  Slider,
  Tooltip,
  Tabs,
  Tab
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import ArticleIcon from '@mui/icons-material/Article';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { useSnackbar } from 'notistack';
import axios from 'axios';

const API_BASE = 'http://localhost:8787';

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index} style={{ paddingTop: 16 }}>
      {value === index && children}
    </div>
  );
}

function RerankingSearch() {
  const [query, setQuery] = useState('As a user, I want to create an account');
  const [limit, setLimit] = useState(10);
  const [rerankTopK, setRerankTopK] = useState(50);
  const [fusionMethod, setFusionMethod] = useState('rrf');
  const [bm25Weight, setBm25Weight] = useState(40);
  const [vectorWeight, setVectorWeight] = useState(60);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [searchInfo, setSearchInfo] = useState(null);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const { enqueueSnackbar } = useSnackbar();

  const handleSearch = async () => {
    if (!query.trim()) {
      enqueueSnackbar('Please enter a search query', { variant: 'warning' });
      return;
    }

    setSearching(true);
    setError(null);
    setResults([]);
    setSearchInfo(null);

    try {
      const response = await axios.post(`${API_BASE}/api/search/rerank`, {
        query,
        limit,
        rerankTopK,
        fusionMethod,
        bm25Weight: bm25Weight / 100,
        vectorWeight: vectorWeight / 100
      });

      if (response.data.success) {
        setResults(response.data.results);
        setSearchInfo({
          count: response.data.count,
          fusionMethod: response.data.fusionMethod,
          stats: response.data.stats,
          totalCandidates: response.data.totalCandidates
        });
        
        enqueueSnackbar(
          `Found ${response.data.count} reranked results from ${response.data.totalCandidates} candidates`, 
          { variant: 'success' }
        );
      } else {
        throw new Error(response.data.error || 'Search failed');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Search failed';
      setError(errorMessage);
      enqueueSnackbar(`Search failed: ${errorMessage}`, { variant: 'error' });
    } finally {
      setSearching(false);
    }
  };

  const formatScore = (score) => {
    return score ? score.toFixed(4) : '0.0000';
  };

  const getScoreColor = (score) => {
    if (score >= 0.8) return 'success';
    if (score >= 0.6) return 'info';
    if (score >= 0.4) return 'warning';
    return 'error';
  };

  return (
    <Box sx={{ maxWidth: 1400, margin: 'auto', padding: 3 }}>
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <CompareArrowsIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            Score Fusion & Reranking
          </Typography>
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Advanced reranking using score fusion methods (RRF, Weighted, Reciprocal) to combine BM25 and Vector search results.
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              label="Search Query"
              variant="outlined"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !searching && handleSearch()}
              placeholder="e.g., user registration, account creation..."
              disabled={searching}
            />
          </Grid>

          <Grid item xs={6} md={2}>
            <TextField
              fullWidth
              label="Final Limit"
              type="number"
              variant="outlined"
              value={limit}
              onChange={(e) => setLimit(Math.max(1, Math.min(50, parseInt(e.target.value) || 10)))}
              disabled={searching}
            />
          </Grid>

          <Grid item xs={6} md={2}>
            <TextField
              fullWidth
              label="Rerank Top-K"
              type="number"
              variant="outlined"
              value={rerankTopK}
              onChange={(e) => setRerankTopK(Math.max(10, Math.min(200, parseInt(e.target.value) || 50)))}
              disabled={searching}
              helperText="Candidates to rerank"
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Fusion Method</InputLabel>
              <Select
                value={fusionMethod}
                onChange={(e) => setFusionMethod(e.target.value)}
                label="Fusion Method"
                disabled={searching}
              >
                <MenuItem value="rrf">Reciprocal Rank Fusion (RRF)</MenuItem>
                <MenuItem value="weighted">Weighted Normalized</MenuItem>
                <MenuItem value="reciprocal">Reciprocal Weighted</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {fusionMethod !== 'rrf' && (
            <>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" gutterBottom>
                  BM25 Weight: {bm25Weight}%
                </Typography>
                <Slider
                  value={bm25Weight}
                  onChange={(e, value) => {
                    setBm25Weight(value);
                    setVectorWeight(100 - value);
                  }}
                  min={0}
                  max={100}
                  step={5}
                  disabled={searching}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" gutterBottom>
                  Vector Weight: {vectorWeight}%
                </Typography>
                <Slider
                  value={vectorWeight}
                  onChange={(e, value) => {
                    setVectorWeight(value);
                    setBm25Weight(100 - value);
                  }}
                  min={0}
                  max={100}
                  step={5}
                  disabled={searching}
                />
              </Grid>
            </>
          )}

          <Grid item xs={12}>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              size="large"
              onClick={handleSearch}
              disabled={searching || !query.trim()}
              startIcon={searching ? <CircularProgress size={20} /> : <SearchIcon />}
            >
              {searching ? 'Reranking...' : 'Rerank Search'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {searchInfo && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Reranking Results:</strong> {searchInfo.count} results from {searchInfo.totalCandidates} candidates
            <br />
            Method: {searchInfo.fusionMethod.toUpperCase()} | 
            Found in both: {searchInfo.stats.foundInBoth} | 
            BM25 only: {searchInfo.stats.foundInBm25Only} | 
            Vector only: {searchInfo.stats.foundInVectorOnly}
          </Typography>
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {results.length > 0 && (
        <Box>
          <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 2 }}>
            <Tab label="Reranked Results" />
            <Tab label="Statistics" />
          </Tabs>

          <TabPanel value={tabValue} index={0}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              <ArticleIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              Reranked Results ({results.length})
            </Typography>

            {results.map((result, index) => (
              <Card key={result._id || index} sx={{ mb: 2 }} elevation={2}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Chip label={`#${index + 1}`} size="small" color="primary" variant="outlined" />
                        <Typography variant="h6" component="div">
                          {result.key || result.storyId || 'No Key'}
                        </Typography>
                        {result.fusedScore && (
                          <Chip 
                            label={`Fused: ${formatScore(result.fusedScore)}`}
                            color={getScoreColor(result.fusedScore)} 
                            size="small"
                          />
                        )}
                        {result.rankChange && result.rankChange !== 0 && (
                          <Chip 
                            icon={result.rankChange > 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
                            label={`${result.rankChange > 0 ? '+' : ''}${result.rankChange}`}
                            color={result.rankChange > 0 ? 'success' : 'error'}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>

                      <Typography variant="h6" color="text.primary" sx={{ mb: 1 }}>
                        {result.summary || 'No Summary'}
                      </Typography>

                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                        {result.project && (
                          <Chip label={`Project: ${result.project}`} size="small" variant="outlined" />
                        )}
                        {result.priority && (
                          <Chip 
                            label={result.priority} 
                            size="small" 
                            color={result.priority === 'High' ? 'error' : result.priority === 'Medium' ? 'warning' : 'default'}
                          />
                        )}
                      </Box>

                      {result.description && (
                        <Typography variant="body2" color="text.secondary">
                          <strong>Description:</strong> {result.description}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Reranking Statistics</Typography>
                {searchInfo && (
                  <Box>
                    <Typography variant="body2">
                      <strong>Fusion Method:</strong> {searchInfo.fusionMethod.toUpperCase()}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Total Candidates:</strong> {searchInfo.totalCandidates}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Final Results:</strong> {searchInfo.count}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Found in Both:</strong> {searchInfo.stats.foundInBoth}
                    </Typography>
                    <Typography variant="body2">
                      <strong>BM25 Only:</strong> {searchInfo.stats.foundInBm25Only}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Vector Only:</strong> {searchInfo.stats.foundInVectorOnly}
                    </Typography>
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

export default RerankingSearch;

