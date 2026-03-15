from custom_neural_network.core.Optimizers.base_optimizer import BaseOptimizer
import numpy as np


class Optimizer_AdaGrad(BaseOptimizer):

    def __init__(self, learning_rate=1.0, decay=0.0, epsilon=1e-7):
        self.learning_rate = learning_rate
        self.current_learning_rate = learning_rate
        self.decay = decay
        self.epsilon = epsilon
        self.iterations = 0
        self.layers = None

    def set_parameters(self, layers):
        self.layers = layers

        for layer in self.layers:
            if hasattr(layer, "weights"):
                layer.weight_cache = np.zeros_like(layer.weights)
                layer.bias_cache = np.zeros_like(layer.biases)

    def step(self):

        if self.decay:
            self.current_learning_rate = (
                self.learning_rate /
                (1 + self.decay * self.iterations)
            )

        for layer in self.layers:
            if not hasattr(layer, "weights"):
                continue

            # Accumulate squared gradients
            layer.weight_cache += layer.dweights ** 2
            layer.bias_cache += layer.dbiases ** 2

            # Parameter update
            layer.weights += -(
                self.current_learning_rate * layer.dweights
            ) / (np.sqrt(layer.weight_cache) + self.epsilon)

            layer.biases += -(
                self.current_learning_rate * layer.dbiases
            ) / (np.sqrt(layer.bias_cache) + self.epsilon)

        self.iterations += 1

    def zero_grad(self):
        for layer in self.layers:
            if hasattr(layer, "dweights"):
                layer.dweights.fill(0)
                layer.dbiases.fill(0)