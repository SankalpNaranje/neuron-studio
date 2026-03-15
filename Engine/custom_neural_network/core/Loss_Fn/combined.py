import numpy as np
from custom_neural_network.core.Activation_Fn.softmax import Softmax_Activation
from custom_neural_network.core.Loss_Fn.cross_entropy import Categorical_Cross_Entropy_Loss
from custom_neural_network.core.Loss_Fn.base_loss import BaseLoss

class Softmax_Cross_Entropy_Combined(BaseLoss):

    def __init__(self):
        self.activation_fn = Softmax_Activation()
        self.loss = Categorical_Cross_Entropy_Loss()

    def forward(self, inputs, y_true):
        self.activation_fn.forward(inputs)
        self.output = self.activation_fn.output

        return self.loss.calculate(self.output, y_true)

    def backward(self, y_true):

        samples = len(self.output)

        if len(y_true.shape) == 2:
            if y_true.shape[1] == 1:
                y_true = y_true.flatten()
            else:
                y_true = np.argmax(y_true, axis=1)

        self.dinputs = self.output.copy()
        self.dinputs[range(samples), y_true] -= 1
        self.dinputs = self.dinputs / samples