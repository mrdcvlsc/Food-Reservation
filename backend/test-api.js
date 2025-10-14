// Test script to verify API logging
const fetch = require('node-fetch');

async function testAPI() {
  console.log('🧪 Testing API endpoints...\n');
  
  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const health = await fetch('http://localhost:4000/');
    const healthData = await health.json();
    console.log('✅ Health check:', healthData);
    
    // Test registration endpoint
    console.log('\n2. Testing registration endpoint...');
    const registerData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'testpassword123',
      grade: '12',
      section: 'A'
    };
    
    const register = await fetch('http://localhost:4000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(registerData)
    });
    
    const registerResult = await register.json();
    console.log('✅ Registration result:', registerResult);
    
    // Test login endpoint
    console.log('\n3. Testing login endpoint...');
    const loginData = {
      email: 'test@example.com',
      password: 'testpassword123'
    };
    
    const login = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(loginData)
    });
    
    const loginResult = await login.json();
    console.log('✅ Login result:', loginResult);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAPI();
