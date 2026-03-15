import numpy as np
from .base_activation import BaseActivation

class Softmax_Activation(BaseActivation):
    
    def forward(self, inputs):
        
        #as exponentials can become large
        exponential_matrix = np.exp(inputs - np.max(inputs , axis=1, keepdims=True))
        probabilities = exponential_matrix / (np.sum(exponential_matrix , axis= 1 , keepdims=True))
        self.output = probabilities
        

    def backward(self, dvalues):

        self.dinputs = np.empty_like(dvalues)

        for index, (single_output, single_dvalues) in enumerate(zip(self.output, dvalues)):
            single_output = single_output.reshape(-1, 1)

            jacobian_matrix = (
                np.diagflat(single_output) -
                np.dot(single_output, single_output.T)
            )

            self.dinputs[index] = np.dot(jacobian_matrix, single_dvalues)
        
    