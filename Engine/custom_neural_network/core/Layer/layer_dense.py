#Dense layer
import numpy as np
from .base_layer import BaseLayer

class Layer_Dense(BaseLayer):
    def __init__(self, no_of_inputs, no_of_neurons, weight_regularizer_l1=0.0, weight_regularizer_l2=0.0, bias_regularizer_l1=0.0, bias_regularizer_l2=0.0):
        #initialize random weights and bias
        self.weights = 0.01 * np.random.randn(no_of_inputs, no_of_neurons)
        self.biases = np.zeros((1, no_of_neurons))
        
        # Set regularizers
        self.weight_regularizer_l1 = weight_regularizer_l1
        self.weight_regularizer_l2 = weight_regularizer_l2
        self.bias_regularizer_l1 = bias_regularizer_l1
        self.bias_regularizer_l2 = bias_regularizer_l2
    
    def forward(self, input):
        self.input = input
        self.output = np.dot(input, self.weights) + self.biases
    
    def backward(self, dvalues):
        #Gradients on parameters
        self.dweights = np.dot(self.input.T, dvalues)
        self.dbiases = np.sum(dvalues, axis=0,keepdims=True)
        
        #Gradients on input value - serves as dvalues for its previous layers
        self.dinputs = np.dot(dvalues,self.weights.T )   