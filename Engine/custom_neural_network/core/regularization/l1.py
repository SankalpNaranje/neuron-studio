import numpy as np

class Regularizer_L1:
    def __init__(self, l1_w=0.0, l1_b=0.0):
        # L1 lambda parameters
        self.l1_w = l1_w
        self.l1_b = l1_b
        
    def calculate_loss(self, layer):
        """Calculate L1 regularization loss for a given layer."""
        regularization_loss = 0.0
        
        # L1 regularization - weights
        if self.l1_w > 0:
            regularization_loss += self.l1_w * np.sum(np.abs(layer.weights))
            
        # L1 regularization - biases
        if self.l1_b > 0:
            regularization_loss += self.l1_b * np.sum(np.abs(layer.biases))
            
        return regularization_loss

    def backward(self, layer):
        """Update gradients based on L1 regularization."""
        # L1 on weights
        if self.l1_w > 0:
            dL1 = np.ones_like(layer.weights)
            dL1[layer.weights < 0] = -1
            layer.dweights += self.l1_w * dL1
            
        # L1 on biases
        if self.l1_b > 0:
            dL1 = np.ones_like(layer.biases)
            dL1[layer.biases < 0] = -1
            layer.dbiases += self.l1_b * dL1
