from custom_neural_network.core.Optimizers.base_optimizer import BaseOptimizer


class Optimizer_SGD(BaseOptimizer):

    def __init__(self, learning_rate=1.0, decay=0.0):
        self.learning_rate = learning_rate
        self.current_learning_rate = learning_rate
        self.decay = decay
        self.iterations = 0
        self.layers = None

    def set_parameters(self, layers):
        self.layers = layers

    def step(self):

        if self.decay:
            self.current_learning_rate = (
                self.learning_rate /
                (1 + self.decay * self.iterations)
            )

        for layer in self.layers:
            if hasattr(layer, "weights"):
                layer.weights += -self.current_learning_rate * layer.dweights
                layer.biases += -self.current_learning_rate * layer.dbiases

        self.iterations += 1

    def zero_grad(self):
        for layer in self.layers:
            if hasattr(layer, "dweights"):
                layer.dweights.fill(0)
                layer.dbiases.fill(0)