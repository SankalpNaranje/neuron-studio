import numpy as np
from custom_neural_network.core.Loss_Fn.base_loss import BaseLoss

class Loss(BaseLoss):
    def calculate(self, output, y):
        sample_losses = self.forward(output, y)
        data_loss = np.mean(sample_losses)
        return data_loss

class Categorical_Cross_Entropy_Loss(Loss):
    
    def forward(self , predicted_val, true_value):
        
        sample = len(predicted_val)
        
        #If model predicts 0 for correct class → crash as log(0) = -infinity and log(1) = infinity.
        #So we clamp values slightly away from 0 and 1.
        y_pred_clipped = np.clip(predicted_val, 1e-7, 1 - 1e-7)
        
        #categorical labels
        if len(true_value.shape) == 1:
            correct_confidence = y_pred_clipped[range(sample), true_value]
        
        # Mask values - only for one-hot encoded labels
        elif len(true_value.shape) == 2:
            correct_confidence = np.sum(y_pred_clipped * true_value ,axis=1)
        
        negative_log_likelihood = -np.log(correct_confidence)
        return negative_log_likelihood
    
    def backward(self, dvalues, y_true):
        samples = len(dvalues)
        labels = len(dvalues[0])

        if len(y_true.shape) == 1:
            y_true = np.eye(labels)[y_true]

        self.dinputs = -y_true / dvalues
        self.dinputs = self.dinputs / samples
    
        
        
        
        
        
        