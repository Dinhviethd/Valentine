import axios from 'axios'

const axiosInstance= axios.create({
    baseURL: import.meta.env.VITE_GOOGLE_CLIENT_ID})
axiosInstance.interceptors.request.use(config)