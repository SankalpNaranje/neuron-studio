import numpy as np

class Regularizer_L2:
    def __init__(self, l2_w=0.0, l2_b=0.0):
        # L2 lambda parameters
        self.l2_w = l2_w
        self.l2_b = l2_b
        
    def calculate_loss(self, layer):
        """Calculate L2 regularization loss for a given layer."""
        regularization_loss = 0.0
        
        # L2 regularization - weights
        if self.l2_w > 0:
            regularization_loss += self.l2_w * np.sum(layer.weights * layer.weights)
            
        # L2 regularization - biases
        if self.l2_b > 0:
            regularization_loss += self.l2_b * np.sum(layer.biases * layer.biases)
            
        return regularization_loss

    def backward(self, layer):
        """Update gradients based on L2 regularization."""
        # L2 on weights
        if self.l2_w > 0:
            layer.dweights += 2 * self.l2_w * layer.weights
            
        # L2 on biases
        if self.l2_b > 0:
            layer.dbiases += 2 * self.l2_b * layer.biases
