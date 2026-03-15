class BaseLayer:
    def forward(self, inputs):
        raise NotImplementedError
    
    def backward(self, dvalues):
        raise NotImplementedError