from custom_neural_network.core.Optimizers.base_optimizer import BaseOptimizer
import numpy as np


class Optimizer_SGD(BaseOptimizer):

    def __init__(self, learning_rate=1.0, decay=0.0, momentum=0.0):
        self.learning_rate = learning_rate
        self.current_learning_rate = learning_rate
        self.decay = decay
        self.momentum = momentum
        self.iterations = 0
        self.layers = None

    def set_parameters(self, layers):
        self.layers = layers

        # Initialize momentum storage
        if self.momentum:
            for layer in self.layers:
                if hasattr(layer, "weights"):
                    layer.weight_momentum = np.zeros_like(layer.weights)
                    layer.bias_momentum = np.zeros_like(layer.biases)

    def step(self):

        if self.decay:
            self.current_learning_rate = (
                self.learning_rate /
                (1 + self.decay * self.iterations)
            )

        for layer in self.layers:
            if not hasattr(layer, "weights"):
                continue

            if self.momentum:

                weight_updates = (
                    self.momentum * layer.weight_momentum
                    - self.current_learning_rate * layer.dweights
                )

                bias_updates = (
                    self.momentum * layer.bias_momentum
                    - self.current_learning_rate * layer.dbiases
                )

                layer.weight_momentum = weight_updates
                layer.bias_momentum = bias_updates

            else:
                weight_updates = -self.current_learning_rate * layer.dweights
                bias_updates = -self.current_learning_rate * layer.dbiases

            layer.weights += weight_updates
            layer.biases += bias_updates

        self.iterations += 1

    def zero_grad(self):
        for layer in self.layers:
            if hasattr(layer, "dweights"):
                layer.dweights.fill(0)
                layer.dbiases.fill(0)