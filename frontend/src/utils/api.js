import axios from 'axios';

const BASE = import.meta.env.VITE_BACKEND_URL;

export async function registerVoice(audioBlob) {
  try {
    const formData = new FormData();
    formData.append('audio', audioBlob);
    
    const response = await axios.post(`${BASE}/api/register`, formData, {
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
    
    const response = await axios.post(`${BASE}/api/verify`, formData, {
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
    
    const response = await axios.post(`${BASE}/api/forensic`, formData, {
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
    
    const response = await axios.post(`${BASE}/api/detect_clone`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  } catch (error) {
    return { error: error.response?.data?.message || error.message };
  }
}

export async function healthCheck() {
  try {
    const response = await axios.get(`${BASE}/api/health`);
    return response.data;
  } catch (error) {
    return { error: error.response?.data?.message || error.message };
  }
}
