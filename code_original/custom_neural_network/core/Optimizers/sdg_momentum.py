import numpy as np

class Optimizer_SDG:
    def __init__(self, learning_rate = 1. , decay = 0. , momentum_factor = 0.):
        self.current_learning_rate = learning_rate
        self.learning_rate = learning_rate
        self.decay = decay
        self.iterations = 0
        self.momentum_factor = momentum_factor
        
    def pre_update_params(self):
        if self.decay:
            self.current_learning_rate = self.learning_rate / (1. + (self.decay * self.iterations))
        
    def update_params(self, layer):
        # momentum
        if self.momentum_factor:
            # If layer does not contain momentum arrays, create them
            # filled with zeros
            if not hasattr(layer, 'weight_momentum'):    #Does this layer already have memory for momentum?
                layer.weight_momentum = np.zeros_like(layer.weights)
                layer.biases_momentum = np.zeros_like(layer.biases)
                
            weight_updates = (self.momentum_factor * layer.weight_momentum) - (self.current_learning_rate * layer.dweights)
            layer.weight_momentum = weight_updates
            
            biases_updates = (self.momentum_factor * layer.biases_momentum) - (self.current_learning_rate * layer.dbiases)
            layer.biases_momentum = biases_updates
            
        else:
            # # Vanilla SGD updates - weight and biases update without momentum 
            weight_updates = - self.current_learning_rate * layer.dweights
            biases_updates = -self.current_learning_rate * layer.dbiases
        
        #weights and biases updates will already contain information about direction. Therefore adding.
        layer.weights += weight_updates
        layer.biases += biases_updates
        
    def post_update_params(self):
        self.iterations +=1
                
            
