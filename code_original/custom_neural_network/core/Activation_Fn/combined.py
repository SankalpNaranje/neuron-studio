from custom_neural_network.core.Activation_Fn.softmax import Softmax_Activation
from custom_neural_network.core.Loss_Fn.cross_entropy import Categorical_Cross_Entropy_Loss
import numpy as np

class Softmax_Cross_Entropy_Combined:
    def __init__(self):
        self.activation_fn = Softmax_Activation()
        self.loss = Categorical_Cross_Entropy_Loss()
        
    def forward(self, inputs , y_true):
        self.activation_fn.forward(inputs)
        self.output = self.activation_fn.output #set the output
        
        loss =self.loss.calculate(self.output , y_true)
        return loss
    
    def backward(self, dvalues, y_true):
        #Formula = Predicted - Ground truth
        #normalization -> divide with number of samples.
        #if not normalized, then the derivative may blow up to huge values. 
        
        #Here, dvalue is self.output of this very same class
        samples = len(dvalues)
        
        if len(y_true.shape) == 2:
            y_true = np.argmax(y_true,axis=1)
        
        #predicted - true 
        self.dinputs = dvalues.copy()  #copied probabilities output (predicted)
        
        #It subtracts 1 from the probability of the correct class.
        self.dinputs[range(samples),y_true] -=1  #This modifies values in-place.
        
        #Normalize
        self.dinputs = self.dinputs/samples
        
        
        
        
        
        
        