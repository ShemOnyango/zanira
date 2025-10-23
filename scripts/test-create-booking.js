import axios from 'axios';

(async () => {
  try {
    const base = 'http://localhost:5000/api/v1';

    // Register a test user (ignore if exists)
    const reg = { firstName: 'ScriptTest', lastName: 'User', email: `script_test_user@example.com`, password: 'Password123!', role: 'client' };
    try {
      await axios.post(`${base}/auth/register`, reg);
      console.log('Registered test user');
    } catch (e) {
      console.log('Register may have failed (user exists):', e.response?.data || e.message);
    }

    // Login
    const loginResp = await axios.post(`${base}/auth/login`, { email: reg.email, password: reg.password });
    const token = loginResp.data.data.token;
    console.log('Token:', token.slice(0, 20) + '...');

    // Get services
    const servicesResp = await axios.get(`${base}/services`);
    const service = servicesResp.data.data[0];
    console.log('Using service:', service._id, service.name);

    // Create booking
    const booking = {
      serviceId: service._id,
      scheduledDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      scheduledTime: '09:00',
      location: {
        county: 'Nairobi',
        town: 'Westlands',
        address: '123 Sample St'
      },
      description: 'Script-created booking'
    };

    const createResp = await axios.post(`${base}/bookings`, booking, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('Create booking response:', createResp.data);
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
    process.exit(1);
  }
})();
