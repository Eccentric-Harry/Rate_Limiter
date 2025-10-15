const express = require('express');
const ApiKey = require('../models/ApiKey');
const UsageWindow = require('../models/UsageWindow');
const AccessLog = require('../models/AccessLog');
const router = express.Router();

// Create new API key
router.post('/keys', async (req, res) => {
  try {
    const { name, perMinute, perDay } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const apiKey = await ApiKey.createKey({
      name,
      perMinute: perMinute || 50,
      perDay: perDay || 1000
    });

    res.status(201).json(apiKey);
  } catch (error) {
    console.error('Error creating API key:', error);
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

// Get all API keys
router.get('/keys', async (req, res) => {
  try {
    const keys = await ApiKey.find().select('-__v').sort({ createdAt: -1 });
    res.json(keys);
  } catch (error) {
    console.error('Error fetching API keys:', error);
    res.status(500).json({ error: 'Failed to fetch API keys' });
  }
});

// Update API key
router.put('/keys/:id', async (req, res) => {
  try {
    const { perMinute, perDay, active, name } = req.body;
    const updateData = {};

    if (name !== undefined) updateData.name = name;
    if (perMinute !== undefined) updateData.perMinute = perMinute;
    if (perDay !== undefined) updateData.perDay = perDay;
    if (active !== undefined) updateData.active = active;

    const updatedKey = await ApiKey.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!updatedKey) {
      return res.status(404).json({ error: 'API key not found' });
    }

    res.json(updatedKey);
  } catch (error) {
    console.error('Error updating API key:', error);
    res.status(500).json({ error: 'Failed to update API key' });
  }
});

// Get key metrics
router.get('/keys/:id', async (req, res) => {
  try {
    const apiKey = await ApiKey.findById(req.params.id);
    if (!apiKey) {
      return res.status(404).json({ error: 'API key not found' });
    }

    const usage = await UsageWindow.getCurrentUsage(apiKey.key);
    
    res.json({
      key: apiKey.key,
      name: apiKey.name,
      perMinute: apiKey.perMinute,
      perDay: apiKey.perDay,
      minute: usage.minute,
      day: usage.day,
      active: apiKey.active
    });
  } catch (error) {
    console.error('Error fetching key metrics:', error);
    res.status(500).json({ error: 'Failed to fetch key metrics' });
  }
});

// Delete API key
router.delete('/keys/:id', async (req, res) => {
  try {
    const apiKey = await ApiKey.findById(req.params.id);
    
    if (!apiKey) {
      return res.status(404).json({ error: 'API key not found' });
    }
    
    // Store the key value before deletion
    const keyValue = apiKey.key;
    
    // Delete the API key
    await ApiKey.findByIdAndDelete(req.params.id);
    
    // Optional: Clean up related usage data
    // This might slow down the operation but ensures no orphaned data
    try {
      // Delete any usage windows for this key
      await UsageWindow.deleteMany({ key: keyValue });
      
      // Delete access logs for this key
      await AccessLog.deleteMany({ key: keyValue });
      
      console.log(`Cleaned up usage data for deleted key: ${keyValue}`);
    } catch (cleanupError) {
      // Log but don't fail the operation if cleanup has issues
      console.warn('Warning: Could not clean up all related usage data:', cleanupError);
    }
    
    // Return success message
    res.json({ 
      success: true, 
      message: 'API key deleted successfully',
      deletedKey: {
        id: req.params.id,
        key: keyValue,
        name: apiKey.name
      }
    });
  } catch (error) {
    console.error('Error deleting API key:', error);
    res.status(500).json({ error: 'Failed to delete API key' });
  }
});

module.exports = router;
