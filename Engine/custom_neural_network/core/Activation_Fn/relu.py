import numpy as np
from .base_activation import BaseActivation

class Relu_Activation(BaseActivation):
    
    #forward
    def forward(self,inputs):
        self.inputs = inputs
        self.output = np.maximum(0,inputs)
        
    def backward(self, dvalues):
        #copy dvalues
        self.dinputs = dvalues.copy()
        # Zero gradient where input values were negative
        self.dinputs[self.inputs <= 0] = 0
    