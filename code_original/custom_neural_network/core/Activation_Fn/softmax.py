import numpy as np

class Softmax_Activation:
    
    def forward(self, input):
        
        #as exponentials can become large
        exponential_matrix = np.exp(input - np.max(input , axis=1, keepdims=True))
        probabilities = exponential_matrix / (np.sum(exponential_matrix , axis= 1 , keepdims=True))
        self.output = probabilities
        


        
    