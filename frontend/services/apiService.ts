const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiService {
  async request(endpoint: string, options: any = {}) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        let body: { message?: string; details?: string; error?: string; responsePreview?: Record<string, string>; dataKeys?: string[] } = {};
        try {
          body = await response.json();
        } catch {
          body = { message: response.statusText || 'API request failed' };
        }
        const message = body.message ?? body.details ?? body.error ?? 'API request failed';
        const err = new Error(message) as Error & { responsePreview?: Record<string, string>; dataKeys?: string[] };
        if (body.responsePreview) err.responsePreview = body.responsePreview;
        if (body.dataKeys) err.dataKeys = body.dataKeys;
        throw err;
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  // Strategies
  async getStrategies() {
    return this.request('/strategies');
  }

  async getStrategy(id: string) {
    return this.request(`/strategies/${id}`);
  }

  async createStrategy(strategy: any) {
    return this.request('/strategies', {
      method: 'POST',
      body: JSON.stringify(strategy),
    });
  }

  async updateStrategy(id: string, strategy: any) {
    return this.request(`/strategies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(strategy),
    });
  }

  async deleteStrategy(id: string) {
    return this.request(`/strategies/${id}`, {
      method: 'DELETE',
    });
  }

  // Benchmarks
  async getBenchmarks() {
    return this.request('/benchmarks');
  }

  async createBenchmark(benchmark: any) {
    return this.request('/benchmarks', {
      method: 'POST',
      body: JSON.stringify(benchmark),
    });
  }

  async updateBenchmark(id: string, benchmark: any) {
    return this.request(`/benchmarks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(benchmark),
    });
  }

  async deleteBenchmark(id: string) {
    return this.request(`/benchmarks/${id}`, {
      method: 'DELETE',
    });
  }

  // Proposals
  async getProposals() {
    return this.request('/proposals');
  }

  async createProposal(proposal: any) {
    return this.request('/proposals', {
      method: 'POST',
      body: JSON.stringify(proposal),
    });
  }

  // Firm Settings
  async getSettings() {
    return this.request('/settings');
  }

  async updateSettings(settings: any) {
    return this.request('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  // Page Library
  async getPageLibrary(positionType?: 'before' | 'after') {
    const query = positionType ? `?position_type=${positionType}` : '';
    return this.request(`/page-library${query}`);
  }

  async getPageFromLibrary(id: string) {
    return this.request(`/page-library/${id}`);
  }

  async createPageInLibrary(page: { name: string; page_data: string; position_type: 'before' | 'after' }) {
    return this.request('/page-library', {
      method: 'POST',
      body: JSON.stringify(page),
    });
  }

  async updatePageInLibrary(id: string, updates: { name?: string }) {
    return this.request(`/page-library/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deletePageFromLibrary(id: string) {
    return this.request(`/page-library/${id}`, {
      method: 'DELETE',
    });
  }

  // Secondary Portfolio
  async fetchSecondaryPortfolioReturns(tickers: { ticker: string; weight: number }[], primaryReturnsDateRange: { startDate: string; endDate: string }) {
    const weights = tickers.map(t => t.weight);
    return this.request('/secondary-portfolio', {
      method: 'POST',
      body: JSON.stringify({ tickers, weights, primaryReturnsDateRange }),
    });
  }
}

export const apiService = new ApiService();
