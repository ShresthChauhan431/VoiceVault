import axios from 'axios';

const BASE = import.meta.env.VITE_BACKEND_URL;

// Create axios instance with default timeout
const api = axios.create({
  baseURL: BASE,
  timeout: 30000, // 30 second timeout
});

export async function registerVoice(audioBlob) {
  try {
    const formData = new FormData();
    formData.append('audio', audioBlob);
    
    const response = await api.post('/api/register', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  } catch (error) {
    return { error: error.response?.data?.message || error.message };
  }
}

export async function verifyVoice(audioBlob, helperString, commitment, salt) {
  try {
    const formData = new FormData();
    formData.append('audio', audioBlob);
    formData.append('helper_string', helperString);
    formData.append('commitment', commitment);
    formData.append('salt', salt);
    
    const response = await api.post('/api/verify', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  } catch (error) {
    return { error: error.response?.data?.message || error.message };
  }
}

export async function forensicAnalysis(audioBlob, helper, commitment, salt) {
  try {
    const formData = new FormData();
    formData.append('audio', audioBlob);
    formData.append('helper', helper);
    formData.append('commitment', commitment);
    formData.append('salt', salt);
    
    const response = await api.post('/api/forensic', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  } catch (error) {
    return { error: error.response?.data?.message || error.message };
  }
}

export async function detectClone(audioBlob, profiles) {
  try {
    const formData = new FormData();
    formData.append('audio', audioBlob);
    formData.append('profiles', JSON.stringify(profiles));
    
    const response = await api.post('/api/detect_clone', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  } catch (error) {
    return { error: error.response?.data?.message || error.message };
  }
}

export async function healthCheck() {
  try {
    const response = await api.get('/api/health');
    return response.data;
  } catch (error) {
    return { error: error.response?.data?.message || error.message };
  }
}

export async function getProfile(address) {
  try {
    const response = await api.get('/api/get_profile', {
      params: { address }
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      return { error: 'not_found' };
    }
    return { error: error.response?.data?.message || error.message };
  }
}
