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
    
    // Store session_id in localStorage for later verification
    if (response.data.session_id) {
      localStorage.setItem('voicevault_session_id', response.data.session_id);
      console.log('[VoiceVault] Session ID stored:', response.data.session_id);
    }
    
    // Also store enrollment data for convenience
    if (response.data.helper_string && response.data.commitment && response.data.salt) {
      localStorage.setItem('voicevault_helper_string', response.data.helper_string);
      localStorage.setItem('voicevault_commitment', response.data.commitment);
      localStorage.setItem('voicevault_salt', response.data.salt);
      console.log('[VoiceVault] Enrollment data stored in localStorage');
    }
    
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
    
    // Include session_id if available for cosine similarity verification
    const sessionId = localStorage.getItem('voicevault_session_id');
    if (sessionId) {
      formData.append('session_id', sessionId);
      console.log('[VoiceVault] Including session_id for verification:', sessionId);
    }
    
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
    formData.append('target_helper', helper);
    formData.append('target_commitment', commitment);
    formData.append('target_salt', salt);
    
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
    formData.append('registered_profiles', JSON.stringify(profiles));
    
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

// Helper to get stored enrollment data from localStorage
export function getStoredEnrollment() {
  const sessionId = localStorage.getItem('voicevault_session_id');
  const helperString = localStorage.getItem('voicevault_helper_string');
  const commitment = localStorage.getItem('voicevault_commitment');
  const salt = localStorage.getItem('voicevault_salt');
  
  if (helperString && commitment && salt) {
    return { sessionId, helperString, commitment, salt };
  }
  return null;
}

// Clear stored enrollment data
export function clearStoredEnrollment() {
  localStorage.removeItem('voicevault_session_id');
  localStorage.removeItem('voicevault_helper_string');
  localStorage.removeItem('voicevault_commitment');
  localStorage.removeItem('voicevault_salt');
  console.log('[VoiceVault] Stored enrollment data cleared');
}
