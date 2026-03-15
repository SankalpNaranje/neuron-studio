#SDG without learning rate
class SDG_Optimizer:
    
    def __init__(self, learning_rate = 1):
        self.learning_rate = learning_rate
    
    def update_params(self, layer):
        layer.weights += -self.learning_rate * layer.dweights
        layer.biases += -self.learning_rate * layer.dbiases
   

#SDG with learning rate       
class SDG_Optimizer_Learning_Rate:
    
    def __init__(self, learning_rate = 1. , decay = 0.):
        self.iterations = 0
        self.current_learning_rate = learning_rate
        self.learning_rate = learning_rate
        self.decay = decay
        
    def pre_update_params(self):
        if self.decay:
            self.current_learning_rate = self.learning_rate / ( 1. + (self.decay * self.iterations))
    
    def update_params(self, layer):
        layer.weights += -self.current_learning_rate * layer.dweights
        layer.biases += -self.current_learning_rate * layer.dbiases
        
    def post_update_params(self):
        self.iterations +=1
    
    
        