import numpy as np
from custom_neural_network.core.regularization.l1 import Regularizer_L1
from custom_neural_network.core.regularization.l2 import Regularizer_L2

class BaseLoss:
    def regularization_loss(self, layer):
        regularization_loss = 0
        
        # L1
        l1 = Regularizer_L1(l1_w=layer.weight_regularizer_l1, l1_b=layer.bias_regularizer_l1)
        regularization_loss += l1.calculate_loss(layer)
            
        # L2
        l2 = Regularizer_L2(l2_w=layer.weight_regularizer_l2, l2_b=layer.bias_regularizer_l2)
        regularization_loss += l2.calculate_loss(layer)
            
        return regularization_loss
    
    def forward(self, inputs, y_true):
        raise NotImplementedError
    
    def backward(self, y_true):
        raise NotImplementedError