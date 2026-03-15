#Dense layer
import numpy as np

class Layer_Dense:
    def __init__(self, no_of_inputs, no_of_neurons):
        #initialize random weights and bias
        self.weights = 0.01 * np.random.randn(no_of_inputs, no_of_neurons)
        self.biases = np.zeros((1, no_of_neurons))
    
    def forward(self, input):
        self.input = input
        self.output = np.dot(input, self.weights) + self.biases
    
    def backward(self, dvalues):
        #Gradients on parameters
        self.dweights = np.dot(self.input.T, dvalues)
        self.dbiases = np.sum(dvalues, axis=0,keepdims=True)
        
        #Gradients on input value - serves as dvalues for its previous layers
        self.dinputs = np.dot(dvalues,self.weights.T )   